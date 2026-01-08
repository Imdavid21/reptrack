-- Fix overly permissive RLS policy on water_reminder_logs
DROP POLICY IF EXISTS "Service can manage logs" ON public.water_reminder_logs;

-- Service role will bypass RLS anyway, so we just need user policies
CREATE POLICY "Users can create own logs" ON public.water_reminder_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own logs" ON public.water_reminder_logs
  FOR UPDATE USING (auth.uid() = user_id);