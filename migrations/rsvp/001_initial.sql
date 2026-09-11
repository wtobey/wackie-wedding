-- Additive migration. Does not modify photo tables or any existing schema.
CREATE SCHEMA IF NOT EXISTS wedding_rsvp;
REVOKE ALL ON SCHEMA wedding_rsvp FROM PUBLIC;

CREATE TABLE wedding_rsvp.settings (
  id integer PRIMARY KEY CHECK (id = 1),
  mode text NOT NULL DEFAULT 'closed' CHECK (mode IN ('closed', 'declines_only', 'open')),
  revision integer NOT NULL DEFAULT 0
);
INSERT INTO wedding_rsvp.settings (id) VALUES (1);
CREATE TABLE wedding_rsvp.parties (
  id text PRIMARY KEY,
  display_name text,
  greeting text,
  revision integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE wedding_rsvp.guests (
  id text PRIMARY KEY,
  party_id text NOT NULL REFERENCES wedding_rsvp.parties(id) ON DELETE RESTRICT,
  import_key text NOT NULL,
  first_name text,
  last_name text,
  preferred_name text,
  normalized_first_name text,
  normalized_last_name text,
  is_unnamed_plus_one boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (party_id, import_key),
  CHECK ((first_name IS NULL AND last_name IS NULL AND is_unnamed_plus_one AND normalized_first_name IS NULL AND normalized_last_name IS NULL)
    OR (first_name IS NOT NULL AND last_name IS NOT NULL AND normalized_first_name IS NOT NULL AND normalized_last_name IS NOT NULL AND length(first_name) > 0 AND length(last_name) > 0 AND length(normalized_first_name) > 0 AND length(normalized_last_name) > 0))
);
CREATE INDEX guests_name_lookup ON wedding_rsvp.guests (normalized_first_name, normalized_last_name);
CREATE TABLE wedding_rsvp.events (
  id text PRIMARY KEY,
  name text NOT NULL,
  starts_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE wedding_rsvp.invitations (
  id text PRIMARY KEY,
  guest_id text NOT NULL REFERENCES wedding_rsvp.guests(id) ON DELETE RESTRICT,
  event_id text NOT NULL REFERENCES wedding_rsvp.events(id) ON DELETE RESTRICT,
  attendance text CHECK (attendance IN ('yes', 'no')),
  meal_choice text,
  dietary_restrictions text,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (guest_id, event_id)
);
CREATE TABLE wedding_rsvp.audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  transaction_id bigint NOT NULL DEFAULT txid_current(),
  actor text NOT NULL,
  operation text NOT NULL,
  table_name text NOT NULL,
  row_id text NOT NULL,
  before_data jsonb,
  after_data jsonb
);
CREATE FUNCTION wedding_rsvp.audit_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO wedding_rsvp.audit_log(actor, operation, table_name, row_id, before_data, after_data)
  VALUES (coalesce(nullif(current_setting('wedding_rsvp.actor', true), ''), 'database'), TG_OP, TG_TABLE_NAME,
    coalesce(NEW.id::text, OLD.id::text),
    CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END);
  RETURN coalesce(NEW, OLD);
END;
$$;
CREATE FUNCTION wedding_rsvp.prevent_data_removal() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'RSVP records and history cannot be deleted or truncated. Use a reviewed recovery migration.';
END;
$$;
CREATE TRIGGER immutable_audit BEFORE UPDATE OR DELETE OR TRUNCATE ON wedding_rsvp.audit_log
  FOR EACH STATEMENT EXECUTE FUNCTION wedding_rsvp.prevent_data_removal();
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['parties','guests','events','invitations','settings'] LOOP
    EXECUTE format('CREATE TRIGGER audit_changes AFTER INSERT OR UPDATE OR DELETE ON wedding_rsvp.%I FOR EACH ROW EXECUTE FUNCTION wedding_rsvp.audit_change()', table_name);
    EXECUTE format('CREATE TRIGGER preserve_records BEFORE DELETE OR TRUNCATE ON wedding_rsvp.%I FOR EACH STATEMENT EXECUTE FUNCTION wedding_rsvp.prevent_data_removal()', table_name);
  END LOOP;
END;
$$;
CREATE TABLE wedding_rsvp.receipts (
  id text PRIMARY KEY,
  scope text NOT NULL,
  payload_hash text NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE wedding_rsvp.rate_limits (
  key text NOT NULL,
  window_start timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 1,
  PRIMARY KEY (key, window_start)
);
-- Never expose guest data via the Supabase public Data API.
DO $$
DECLARE table_name text; role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE ALL ON SCHEMA wedding_rsvp FROM %I', role_name);
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA wedding_rsvp FROM %I', role_name);
    END IF;
  END LOOP;
  FOR table_name IN SELECT tablename FROM pg_tables WHERE schemaname = 'wedding_rsvp' LOOP
    EXECUTE format('ALTER TABLE wedding_rsvp.%I ENABLE ROW LEVEL SECURITY', table_name);
  END LOOP;
END;
$$;
INSERT INTO wedding_rsvp.events (id, name) VALUES
  ('wedding', 'Ceremony & Reception'), ('welcome-party', 'Welcome Party'),
  ('brunch', 'Recovery Brunch'), ('rehearsal-dinner', 'Rehearsal Dinner');
