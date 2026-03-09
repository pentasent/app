/*
  # Insert admin user for Pentasent app

  1. Changes
    - Insert admin user with predefined credentials
    - Admin email: admin@pentasent.com
    - Admin password: PentasentAdmin2026!
  
  2. Notes
    - Uses DO block to check if user already exists before inserting
    - This ensures the migration is idempotent
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM users WHERE email = 'admin@pentasent.com'
  ) THEN
    INSERT INTO users (email, password, name, created_at)
    VALUES (
      'admin@pentasent.com',
      'PentasentAdmin2026!',
      'Admin',
      now()
    );
  END IF;
END $$;