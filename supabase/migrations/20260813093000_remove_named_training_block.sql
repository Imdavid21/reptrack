ALTER TABLE public.training_state ALTER COLUMN block_name SET DEFAULT 'Adaptive PPL';
UPDATE public.training_state SET block_name = 'Adaptive PPL' WHERE block_name ILIKE '%durga%';
