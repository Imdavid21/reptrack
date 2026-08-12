-- Additive support for the authenticated, read-only fitness MCP service.
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Asia/Kolkata';

ALTER TABLE public.user_preferences
  ADD CONSTRAINT user_preferences_timezone_valid
  CHECK (length(timezone) BETWEEN 1 AND 64 AND timezone ~ '^[A-Za-z0-9_+./-]+$')
  NOT VALID;

CREATE TABLE IF NOT EXISTS public.mcp_audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_name text NOT NULL CHECK (length(tool_name) BETWEEN 1 AND 80),
  duration_ms integer NOT NULL CHECK (duration_ms >= 0),
  success boolean NOT NULL,
  error_category text CHECK (error_category IS NULL OR length(error_category) <= 80)
);

CREATE INDEX IF NOT EXISTS mcp_audit_logs_user_created_idx
  ON public.mcp_audit_logs (user_id, created_at DESC);

ALTER TABLE public.mcp_audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can inspect their own sanitized MCP activity, but cannot create or alter it.
DROP POLICY IF EXISTS "Users can view own MCP audit logs" ON public.mcp_audit_logs;
CREATE POLICY "Users can view own MCP audit logs"
  ON public.mcp_audit_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.mcp_audit_logs FROM anon, authenticated;
GRANT SELECT ON public.mcp_audit_logs TO authenticated;

COMMENT ON TABLE public.mcp_audit_logs IS
  'Sanitized MCP audit metadata only. Never stores credentials, arguments, or fitness payloads.';
