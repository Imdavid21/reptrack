-- Water reminder automation configs
CREATE TABLE public.water_reminder_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  telegram_username TEXT NOT NULL,
  telegram_chat_id TEXT,
  frequency_minutes INTEGER NOT NULL DEFAULT 60,
  start_time TIME NOT NULL DEFAULT '08:00',
  end_time TIME NOT NULL DEFAULT '22:00',
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.water_reminder_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own config" ON public.water_reminder_configs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own config" ON public.water_reminder_configs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own config" ON public.water_reminder_configs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own config" ON public.water_reminder_configs
  FOR DELETE USING (auth.uid() = user_id);

-- Water reminder logs for tracking attempts
CREATE TABLE public.water_reminder_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  attempt_number INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'expired')),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.water_reminder_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own logs" ON public.water_reminder_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service can manage logs" ON public.water_reminder_logs
  FOR ALL USING (true);

CREATE INDEX idx_water_reminder_logs_user_status ON public.water_reminder_logs(user_id, status);
CREATE INDEX idx_water_reminder_logs_sent_at ON public.water_reminder_logs(sent_at);