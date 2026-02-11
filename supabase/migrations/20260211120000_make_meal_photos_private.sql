-- Make meal photos private; image analysis uses short-lived signed URLs instead.
UPDATE storage.buckets
SET public = false
WHERE id = 'meal-photos';

DROP POLICY IF EXISTS "Meal photos are publicly accessible" ON storage.objects;
