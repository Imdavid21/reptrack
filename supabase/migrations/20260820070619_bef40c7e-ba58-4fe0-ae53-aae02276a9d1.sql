DELETE FROM public.exercises WHERE workout_id = '0e09abf5-ff60-4237-91c6-374d4e5e0c11';
DELETE FROM public.calorie_burns WHERE user_id = 'c534bdf0-812b-4f0d-be92-838059352d45' AND date = '2026-08-20' AND (activity_type = 'workout:0e09abf5-ff60-4237-91c6-374d4e5e0c11' OR id = '336dd448-ce20-4e26-981f-63a44cd4226a');
DELETE FROM public.workouts WHERE id = '0e09abf5-ff60-4237-91c6-374d4e5e0c11';
DELETE FROM public.meals WHERE id = '27ce7be0-e3af-478e-a08f-d5eb7394457d';
DELETE FROM public.water_logs WHERE id = '75ef2421-fc42-4a84-b064-1fe8c19e45aa';