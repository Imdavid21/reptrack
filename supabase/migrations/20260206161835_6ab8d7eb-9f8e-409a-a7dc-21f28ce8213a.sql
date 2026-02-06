-- Delete test accounts and all their related data (cascade via RLS/triggers)
DELETE FROM auth.users WHERE email IN (
  'testuser_fix@test.com', 
  'testuser_e2e@test.com', 
  'newuser_e2e_test@test.com', 
  'testuser_e2e2@test.com', 
  'verify_test_user@test.com'
);