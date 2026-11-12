-- ---------------------------------------------------------------------------
-- 002_optional_email.sql – Support mobile-first citizen registration
-- Allows email to be optional for citizens while requiring mobile number.
-- ---------------------------------------------------------------------------

-- Make email nullable for citizens who do not have or use email
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

-- Ensure phone numbers are unique (cleaned of spaces/dashes) when provided
CREATE UNIQUE INDEX IF NOT EXISTS users_mobile_unique
  ON users (regexp_replace(mobile, '[^0-9]', '', 'g'))
  WHERE mobile IS NOT NULL;

-- Require at least one contact identifier: email OR mobile
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_contact_identifier_check;
ALTER TABLE users ADD CONSTRAINT users_contact_identifier_check
  CHECK (email IS NOT NULL OR mobile IS NOT NULL);
