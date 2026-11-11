-- ---------------------------------------------------------------------------
-- 001_init.sql – CM Kerala grievance portal schema
-- All tables, constraints and indexes used by the application.
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------------
-- Reference data
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS departments (
  id                SERIAL PRIMARY KEY,
  code              TEXT NOT NULL UNIQUE,
  name              TEXT NOT NULL,
  short_description TEXT NOT NULL DEFAULT '',
  contact_email     TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id                  SERIAL PRIMARY KEY,
  slug                TEXT NOT NULL UNIQUE,
  name                TEXT NOT NULL,
  description         TEXT NOT NULL DEFAULT '',
  default_department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Users (citizens, CMO admins, department officers)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  mobile        TEXT,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('CITIZEN', 'CMO_ADMIN', 'DEPT_OFFICER')),
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT users_email_lower_unique UNIQUE (email)
);

-- Officers must belong to a department; citizens must not.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_department_check;
ALTER TABLE users ADD CONSTRAINT users_role_department_check
  CHECK (
    (role = 'DEPT_OFFICER' AND department_id IS NOT NULL)
    OR (role <> 'DEPT_OFFICER')
  );

CREATE UNIQUE INDEX IF NOT EXISTS users_email_ci_key ON users (lower(email));
CREATE INDEX IF NOT EXISTS users_department_idx ON users (department_id) WHERE role = 'DEPT_OFFICER';

-- ---------------------------------------------------------------------------
-- Reference ID generator. A Postgres sequence guarantees uniqueness even
-- under concurrent submissions; the year prefix is cosmetic.
-- ---------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS grievance_ref_seq START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION generate_grievance_ref(at TIMESTAMPTZ DEFAULT now())
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  seq BIGINT;
BEGIN
  seq := nextval('grievance_ref_seq');
  RETURN 'CMK-' || to_char(at, 'YYYY') || '-' || lpad(seq::text, 6, '0');
END;
$$;

-- ---------------------------------------------------------------------------
-- Grievances
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS grievances (
  id             SERIAL PRIMARY KEY,
  ref_no         TEXT NOT NULL UNIQUE,
  citizen_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  district       TEXT NOT NULL,
  category_id    INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  department_id  INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  subject        TEXT NOT NULL,
  description    TEXT NOT NULL,
  priority       TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High')),
  status         TEXT NOT NULL DEFAULT 'Submitted'
                 CHECK (status IN ('Submitted', 'Under Review', 'In Progress', 'Resolved', 'Reopened')),
  -- AI advisory fields. Never overwrite official fields automatically.
  ai_category        TEXT,
  ai_department      TEXT,
  ai_priority        TEXT CHECK (ai_priority IN ('Low', 'Medium', 'High')),
  ai_priority_reason TEXT,
  ai_summary         TEXT,
  ai_language        TEXT,
  ai_source          TEXT,
  ai_confidence      NUMERIC(4, 3),
  ai_accepted        BOOLEAN NOT NULL DEFAULT FALSE,
  ai_analyzed_at     TIMESTAMPTZ,
  -- Escalation bookkeeping
  escalated_at       TIMESTAMPTZ,
  escalation_count   INTEGER NOT NULL DEFAULT 0,
  resolved_at        TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS grievances_citizen_idx ON grievances (citizen_id, created_at DESC);
CREATE INDEX IF NOT EXISTS grievances_department_idx ON grievances (department_id, created_at DESC);
CREATE INDEX IF NOT EXISTS grievances_status_idx ON grievances (status);
CREATE INDEX IF NOT EXISTS grievances_district_idx ON grievances (district);
CREATE INDEX IF NOT EXISTS grievances_category_idx ON grievances (category_id);
CREATE INDEX IF NOT EXISTS grievances_priority_idx ON grievances (priority);
CREATE INDEX IF NOT EXISTS grievances_created_idx ON grievances (created_at DESC);
CREATE INDEX IF NOT EXISTS grievances_description_trgm_idx
  ON grievances USING gin (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS grievances_subject_trgm_idx
  ON grievances USING gin (subject gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- Status history – one row per event (including same-status notes)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS grievance_history (
  id               BIGSERIAL PRIMARY KEY,
  grievance_id     INTEGER NOT NULL REFERENCES grievances(id) ON DELETE CASCADE,
  from_status      TEXT,
  to_status        TEXT NOT NULL,
  changed_by       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  changed_by_role  TEXT NOT NULL,
  remark           TEXT,
  is_internal      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS grievance_history_grievance_idx
  ON grievance_history (grievance_id, created_at ASC);

-- ---------------------------------------------------------------------------
-- Department assignments + action-taken reports
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS department_assignments (
  id                    SERIAL PRIMARY KEY,
  grievance_id          INTEGER NOT NULL REFERENCES grievances(id) ON DELETE CASCADE,
  department_id         INTEGER NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  officer_id            INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_by           INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  action_taken_report   TEXT,
  report_submitted_at   TIMESTAMPTZ,
  report_status         TEXT NOT NULL DEFAULT 'PENDING'
                        CHECK (report_status IN ('PENDING', 'SUBMITTED', 'ACCEPTED', 'SENT_BACK')),
  report_reviewed_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  report_reviewed_at    TIMESTAMPTZ,
  review_remark         TEXT,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS assignments_grievance_idx ON department_assignments (grievance_id, assigned_at DESC);
CREATE INDEX IF NOT EXISTS assignments_department_idx ON department_assignments (department_id);
CREATE INDEX IF NOT EXISTS assignments_officer_idx ON department_assignments (officer_id);
-- At most one active assignment per grievance.
CREATE UNIQUE INDEX IF NOT EXISTS assignments_one_active_idx
  ON department_assignments (grievance_id) WHERE is_active;

-- ---------------------------------------------------------------------------
-- Attachments (bytes live in the database, served through an authorised route)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attachments (
  id            SERIAL PRIMARY KEY,
  grievance_id  INTEGER NOT NULL REFERENCES grievances(id) ON DELETE CASCADE,
  uploaded_by   INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  filename      TEXT NOT NULL,
  mime          TEXT NOT NULL,
  size          INTEGER NOT NULL,
  data          BYTEA NOT NULL,
  kind          TEXT NOT NULL DEFAULT 'complaint' CHECK (kind IN ('complaint', 'action_report')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS attachments_grievance_idx ON attachments (grievance_id);

-- ---------------------------------------------------------------------------
-- Citizen feedback (one per grievance) and reopen tracking
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS citizen_feedback (
  id           SERIAL PRIMARY KEY,
  grievance_id INTEGER NOT NULL UNIQUE REFERENCES grievances(id) ON DELETE CASCADE,
  citizen_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating       INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- AI duplicate flags (advisory only, never merged automatically)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS grievance_duplicates (
  id              SERIAL PRIMARY KEY,
  grievance_id    INTEGER NOT NULL REFERENCES grievances(id) ON DELETE CASCADE,
  duplicate_of_id INTEGER NOT NULL REFERENCES grievances(id) ON DELETE CASCADE,
  similarity      NUMERIC(4, 3) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (grievance_id, duplicate_of_id),
  CHECK (grievance_id <> duplicate_of_id)
);

CREATE INDEX IF NOT EXISTS grievance_duplicates_grievance_idx ON grievance_duplicates (grievance_id);

-- ---------------------------------------------------------------------------
-- Contact enquiries
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contact_enquiries (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  subject    TEXT NOT NULL,
  message    TEXT NOT NULL,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- AI audit log – deliberately excludes complaint text / personal data.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_audit_logs (
  id          BIGSERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  endpoint    TEXT NOT NULL,
  source      TEXT NOT NULL,
  model       TEXT,
  success     BOOLEAN NOT NULL,
  latency_ms  INTEGER,
  input_chars INTEGER,
  language    TEXT,
  error_code  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_audit_created_idx ON ai_audit_logs (created_at DESC);

-- ---------------------------------------------------------------------------
-- updated_at trigger for grievances/users
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS grievances_set_updated_at ON grievances;
CREATE TRIGGER grievances_set_updated_at
  BEFORE UPDATE ON grievances
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS users_set_updated_at ON users;
CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
