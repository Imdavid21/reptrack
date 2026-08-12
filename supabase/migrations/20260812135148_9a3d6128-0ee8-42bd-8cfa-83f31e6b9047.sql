CREATE TABLE IF NOT EXISTS public.mcp_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_name text NOT NULL,
  duration_ms integer NOT NULL DEFAULT 0,
  success boolean NOT NULL DEFAULT true,
  error_category text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.mcp_audit_logs TO authenticated;
GRANT ALL ON public.mcp_audit_logs TO service_role;

ALTER TABLE public.mcp_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own MCP audit logs" ON public.mcp_audit_logs;
CREATE POLICY "Users can view their own MCP audit logs"
  ON public.mcp_audit_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS mcp_audit_logs_user_created_idx
  ON public.mcp_audit_logs (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bucket text NOT NULL,
  window_start timestamptz NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 0,
  UNIQUE (user_id, bucket)
);

GRANT ALL ON public.api_rate_limits TO service_role;

ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.check_rate_limit(p_bucket text, p_max integer, p_window_seconds integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_count integer;
BEGIN
  IF v_user IS NULL THEN
    RETURN false;
  END IF;

  INSERT INTO public.api_rate_limits (user_id, bucket, window_start, request_count)
  VALUES (v_user, p_bucket, now(), 1)
  ON CONFLICT (user_id, bucket) DO UPDATE
    SET request_count = CASE
          WHEN public.api_rate_limits.window_start < now() - make_interval(secs => p_window_seconds)
            THEN 1
          ELSE public.api_rate_limits.request_count + 1
        END,
        window_start = CASE
          WHEN public.api_rate_limits.window_start < now() - make_interval(secs => p_window_seconds)
            THEN now()
          ELSE public.api_rate_limits.window_start
        END
  RETURNING request_count INTO v_count;

  RETURN v_count <= p_max;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) TO authenticated;