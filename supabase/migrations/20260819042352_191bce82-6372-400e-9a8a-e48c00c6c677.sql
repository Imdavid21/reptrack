DELETE FROM public.exercises WHERE workout_id='11111111-2222-3333-4444-555555555555';
DELETE FROM public.calorie_burns WHERE user_id='c534bdf0-812b-4f0d-be92-838059352d45' AND date='2026-08-19' AND (source='workout' OR (activity_type='walking' AND duration_minutes=14));
DELETE FROM public.workouts WHERE id='11111111-2222-3333-4444-555555555555';
DELETE FROM public.meals WHERE id='9e402b5d-f495-4576-bf93-05de18582218';
DELETE FROM public.water_logs WHERE id='bbdb6b57-e76d-4bc6-be68-13f12f0e2045';