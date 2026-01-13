-- Enable realtime for water_logs table so Telegram logs sync instantly
ALTER PUBLICATION supabase_realtime ADD TABLE public.water_logs;