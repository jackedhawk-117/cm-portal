-- ---------------------------------------------------------------------------
-- 003_otp_verification.sql – OTP verification table for passwordless citizen login
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS otp_verifications (
  id          SERIAL PRIMARY KEY,
  mobile      TEXT NOT NULL,
  otp_hash    TEXT NOT NULL,
  attempts    INTEGER NOT NULL DEFAULT 0,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS otp_verifications_mobile_idx
  ON otp_verifications (mobile, created_at DESC);
