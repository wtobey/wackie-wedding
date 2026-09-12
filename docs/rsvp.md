# RSVP system and recovery

## Status

Implemented on `codex/rsvp-system`. No production database migration has been run. The local Docker database contains the draft guest-list import and clearly labeled synthetic test fixtures; local responses are test data and must not be copied to production. The initial migration defaults to **closed**. Production opening additionally requires `RSVP_RECOVERY_READY=true` after the recovery checklist below is completed.

## Backups: what protects what

A full snapshot after every response is unnecessary and would add latency without providing a coherent recovery strategy. A successful save commits all responses, guest-name changes, audit history and its retry receipt in one PostgreSQL transaction. Historical values are retained on every insert/update. Database triggers reject deletion/truncation of RSVP records and modification of the audit history. This prevents ordinary application mistakes; the database owner can bypass these protections, and history in the same database is not disaster recovery.

Supabase Pro retains seven daily backups (Team 14, Enterprise up to 30). Free projects need independent exports. Daily backups may lose changes since the last backup. Paid point-in-time recovery provides finer recovery points; verify that it is enabled on this particular project. Database backups **do not include Supabase Storage photo objects**. See https://supabase.com/docs/guides/platform/backups.

For this wedding, use managed PITR if available, plus encrypted offsite daily database exports and a separate backup of Storage objects. If PITR is not enabled, choose an export interval based on the amount of recent data you can tolerate losing. Neither daily dumps nor same-database audit history can promise zero loss. A literal zero-loss requirement needs a separately acknowledged durable replica/journal and a tested failover design before accepting submissions.

## Before accepting live RSVPs

1. Confirm the exact Supabase project and plan; verify daily backup/PITR status in its dashboard. The credentials available to this task were masked, so this has **not** been verified.
2. Choose an independent private backup destination, encryption, retention and a monitored backup schedule. A dump on the developer laptop alone is insufficient. Confirm separate photo-object backups too.
3. Obtain a direct PostgreSQL connection (`RSVP_DATABASE_URL`, or existing `POSTGRES_URL` fallback). Use server-only credentials, never `NEXT_PUBLIC_*`. The role needs access to the private `wedding_rsvp` schema. No anonymous/authenticated Supabase Data API access is granted.
4. Run `npm run rsvp:backup`. It creates a complete database custom-format dump with restricted permissions, checks that `pg_restore` can read it and writes a checksum manifest. `pg_dump`/`pg_restore` must be the same major version as the server or newer. Set `PG_DUMP_BIN` / `PG_RESTORE_BIN` if needed. Set `RSVP_BACKUP_DIRECTORY` for an appropriate private destination.
5. Copy the dump and manifest to independent storage; restore into a **new, empty, isolated database** using the procedure below. Verify counts and guest responses. This has been tested locally with synthetic data, but must also be tested on the real project's backup.
6. Review migrations and run `RSVP_ALLOW_REMOTE_MIGRATION=true npm run rsvp:migrate`. It requires a fresh successful backup, serializes migrations, verifies checksums, and applies pending migrations atomically. It never resets tables or runs migrations during HTTP requests. Existing photo schemas are untouched.
7. Configure `RSVP_SESSION_SECRET` (at least 32 random bytes recommended; server-only) or use the existing admin password as a signing-secret fallback. Confirm admin access uses `WEDDING_ADMIN_PASSWORD` (minimum 16 characters).
8. Deploy, verify closed-mode behavior and admin imports. Set `RSVP_RECOVERY_READY=true` only after steps 1–5 are complete, then select **Early declines only** in `/admin/rsvp`. Yes responses are not available in the current release.

## Restore drill

Do not restore over production to test a backup. Create a fresh isolated database and use PostgreSQL client environment variables (`PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`, `PGSSLMODE`) for that target; avoid credentials in shell arguments/history.

```
pg_restore --list /private/path/database.dump
pg_restore --exit-on-error --single-transaction --no-owner --no-acl \
  --dbname="$PGDATABASE" /private/path/database.dump
```

Verify the dump's SHA-256 against its manifest. Compare counts in parties, guests, events, invitations, receipts and audit_log; inspect a known party's attendance, dietary metadata and plus-one identity. Test lookup and editing with the application pointed to the isolated database. Record the drill date, backup time, result and recovery time. Verify Storage object recovery independently.

For an actual incident: close RSVP first, preserve the current database as another dump, restore to a separate database, and compare/reconcile newer committed responses before any cutover. Do not blindly restore yesterday's snapshot over today's responses. The admin JSON export includes all RSVP tables, previous values and save receipts, but is not a replacement for a complete database backup.

## Admin workflow

- `/admin/rsvp` uses the same admin sign-in as the photo manager.
- Download the CSV template, replace synthetic rows with your guests, choose events and preview. Apply only after reviewing counts/warnings. Imported events are additive; omitted rows and omitted event IDs never remove guests/invitations.
- Required CSV columns: `party_id,display_name,greeting,first_name,last_name,preferred_name,is_unnamed_plus_one`.
- Optional: `guest_id` (stable identity), `event_ids` (semicolon-separated event IDs, overriding checked defaults for that row).
- Pre-created event IDs: `wedding`, `welcome-party`, `brunch`, `rehearsal-dinner`. Dates are optional and currently unset; additional events require an additive migration.
- Without `guest_id`, the original normalized name identifies a named guest within the party, and one unnamed plus-one uses a stable unnamed slot. Use explicit different guest IDs for multiple unnamed seats or identical names in one party.
- Always export and use `guest_id` when correcting names; changing a name in a CSV without its stable guest ID may create a new seat. Re-importing the original blank plus-one keeps the name supplied by the guest. Imports cannot move guests between parties or change their plus-one flag.
- Blank fields preserve existing values, not clear them. Repeated party names/greetings must agree. Response fields are never imported or overwritten.
- The admin screen displays live responses; the full JSON snapshot includes response timestamps, metadata, change history and receipts. The guest-list CSV includes IDs and event invitations for safe re-import; it is not a response backup.
- No destructive UI actions are provided. Corrections that remove a record require a separately reviewed migration and backup.

## Guest flow and privacy

`/rsvp` looks up exact normalized first/last names. Duplicate matches show only matching party labels. Selecting a party is checked against the supplied name again. A successful lookup issues a signed, HttpOnly, one-hour party-scoped cookie; no invite code is shown. This is name-based access as requested, not proof of identity. Someone who knows a guest's name can find that party.

The current public flow accepts only declines. Guests select which party members cannot attend and confirm once. `POST /api/rsvp` takes `{action: "decline", partyId, revision, requestId, guestIds}`. The server expands the selected IDs into a no response for every existing invitation in the same transaction. In a primary-and-plus-one party, selecting the primary automatically includes the plus-one, even after the plus-one has a saved name. The plus-one does not get a separate checkbox. In larger households without an explicit owner relationship, plus-ones remain selectable and are automatically included when all primary guests decline. Other guests, guest names and meal/dietary metadata remain unchanged. There are no per-event choices, plus-one naming prompts or yes options. Changes of plans are directed to Will or Jackie.

Saves require the party cookie, same-origin JSON, a current party `revision` and a unique `requestId`. A retry with the same ID/payload returns the committed receipt; changed payload reuse is rejected. Stale edits return HTTP 409 and require a fresh lookup. Every supplied guest/event pair is checked before commit. No full guest list is exposed publicly. Responses only go to PostgreSQL; analytics captures page visits, not names, dietary details or form values.

Lookup/save rate limits use shared database counters (30 per IP per hour and 300 globally per action). Vercel uses its overwritten `x-vercel-forwarded-for`; non-Vercel local development shares a local counter. Revisit this IP adapter before deploying to a different host. Session and request payloads never appear in application logs.

## Local development and tests

Use a separate PostgreSQL database, never production:

```
docker run --name wackie-rsvp-dev -e POSTGRES_DB=wedding_rsvp_dev \
  -e POSTGRES_PASSWORD=YOUR_LOCAL_PASSWORD -p 127.0.0.1:55439:5432 \
  -v wackie-rsvp-dev-data:/var/lib/postgresql/data -d postgres:17
```

Set the ignored `.env.local` `RSVP_DATABASE_URL` to that database, run `npm run rsvp:migrate`, then `npm run rsvp:seed-local`. Fixtures refuse nonlocal or non-dev database names. Try **Kelly Bond** (plus-one) and **John Smith** (two matching parties). The fixture script enables early declines in this local database only.

Run `npm run test:rsvp` for validation tests; set `RSVP_TEST_DATABASE_URL` to local PostgreSQL to include database integration tests. Integration tests create and remove their own uniquely named database. They cover rollback, concurrent saves, idempotent retries, import preservation, event/party validation, plus-one identity, early declines and database-level deletion/audit protections.
