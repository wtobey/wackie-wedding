-- Additive: retain rolled-back records instead of deleting them.
ALTER TABLE wedding_rsvp.parties ADD COLUMN archived_at timestamptz;
ALTER TABLE wedding_rsvp.guests ADD COLUMN archived_at timestamptz;
ALTER TABLE wedding_rsvp.invitations ADD COLUMN archived_at timestamptz;
CREATE TABLE wedding_rsvp.snapshots (
  id text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  kind text NOT NULL CHECK (kind IN ('manual','before_import','after_import','before_rollback')),
  operation_id text NOT NULL,
  revision integer NOT NULL,
  payload jsonb NOT NULL,
  checksum text NOT NULL,
  UNIQUE(operation_id,kind)
);
CREATE TABLE wedding_rsvp.import_rollbacks (
  import_id text PRIMARY KEY,
  snapshot_id text NOT NULL REFERENCES wedding_rsvp.snapshots(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE wedding_rsvp.snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE wedding_rsvp.import_rollbacks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON wedding_rsvp.snapshots, wedding_rsvp.import_rollbacks FROM PUBLIC;
CREATE TRIGGER immutable_snapshot BEFORE UPDATE OR DELETE OR TRUNCATE ON wedding_rsvp.snapshots
  FOR EACH STATEMENT EXECUTE FUNCTION wedding_rsvp.prevent_data_removal();
CREATE TRIGGER immutable_rollback BEFORE UPDATE OR DELETE OR TRUNCATE ON wedding_rsvp.import_rollbacks
  FOR EACH STATEMENT EXECUTE FUNCTION wedding_rsvp.prevent_data_removal();
-- Rollback must never make a saved response disappear from the active list.
CREATE FUNCTION wedding_rsvp.protect_archived_responses() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.archived_at IS NOT NULL THEN
    IF TG_TABLE_NAME = 'invitations' THEN
      IF NEW.attendance IS NOT NULL OR NEW.responded_at IS NOT NULL OR NEW.meal_choice IS NOT NULL OR NEW.dietary_restrictions IS NOT NULL THEN
        RAISE EXCEPTION 'An invitation with a response cannot be archived.';
      END IF;
    ELSIF TG_TABLE_NAME = 'guests' THEN
      IF EXISTS (SELECT 1 FROM wedding_rsvp.invitations WHERE guest_id=NEW.id AND archived_at IS NULL) THEN
        RAISE EXCEPTION 'A guest with active invitations cannot be archived.';
      END IF;
    ELSIF TG_TABLE_NAME = 'parties' THEN
      IF EXISTS (SELECT 1 FROM wedding_rsvp.guests WHERE party_id=NEW.id AND archived_at IS NULL) THEN
        RAISE EXCEPTION 'A party with active guests cannot be archived.';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER protect_archived_responses BEFORE UPDATE ON wedding_rsvp.invitations
  FOR EACH ROW EXECUTE FUNCTION wedding_rsvp.protect_archived_responses();
CREATE TRIGGER protect_archived_guests BEFORE UPDATE ON wedding_rsvp.guests
  FOR EACH ROW EXECUTE FUNCTION wedding_rsvp.protect_archived_responses();
CREATE TRIGGER protect_archived_parties BEFORE UPDATE ON wedding_rsvp.parties
  FOR EACH ROW EXECUTE FUNCTION wedding_rsvp.protect_archived_responses();
