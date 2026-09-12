import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { applyMigrations } from "../../scripts/rsvp/migrations";
import {
  adminData,
  commitImport,
  lookup,
  party,
  previewImport,
  settings,
  setMode,
  submit,
} from "./service";
import {
  captureRsvp,
  commitRollback,
  manualSnapshot,
  previewRollback,
  readSnapshot,
  snapshotChecksum,
  snapshotList,
} from "./snapshots";

const connection = process.env.RSVP_TEST_DATABASE_URL;
test("snapshot checksums survive JSONB key ordering", () => {
  assert.equal(
    snapshotChecksum({ z: [{ b: 2, a: 1 }], a: null }),
    snapshotChecksum({ a: null, z: [{ a: 1, b: 2 }] }),
  );
  assert.notEqual(snapshotChecksum({ a: 1 }), snapshotChecksum({ a: 2 }));
});
test(
  "RSVP import snapshots and safe rollback in PostgreSQL",
  { skip: !connection },
  async (t) => {
    const url = new URL(connection!);
    assert(["localhost", "127.0.0.1"].includes(url.hostname));
    const root = postgres(connection!, { max: 1 });
    const name = "rsvp_snapshots_" + randomUUID().replaceAll("-", "");
    await root.unsafe(`CREATE DATABASE ${name}`);
    url.pathname = "/" + name;
    const db = postgres(url.toString(), { max: 5 });
    const csv = (
      p: string,
      g: string,
      first = "Alex",
      display = "The Morgan family",
      events = "wedding",
    ) =>
      `party_id,guest_id,display_name,greeting,first_name,last_name,preferred_name,is_unnamed_plus_one,event_ids\n${p},${g},${display},,${first},Morgan,,false,${events}`;
    async function upload(source: string) {
      const preview = await previewImport(db, source, []);
      const requestId = randomUUID();
      await commitImport(
        db,
        source,
        [],
        preview.revision,
        preview.hash,
        requestId,
      );
      const [snapshot] =
        await db`SELECT id FROM wedding_rsvp.snapshots WHERE operation_id=${requestId} AND kind='before_import'`;
      return { id: String(snapshot.id), requestId, preview };
    }
    async function respond(p: string, g: string, event = "wedding") {
      return submit(db, {
        partyId: p,
        revision: (await party(db, p)).revision,
        requestId: randomUUID(),
        responses: [{ guestId: g, eventId: event, attendance: "no" }],
      });
    }
    async function undo(id: string) {
      const p = await previewRollback(db, id);
      assert.deepEqual(p.conflicts, []);
      return commitRollback(db, id, p.revision, p.hash);
    }
    try {
      await applyMigrations(db);
      await setMode(db, "declines_only", (await settings(db)).revision);
      await t.test(
        "manual snapshot includes all RSVP data and is immutable/idempotent",
        async () => {
          const request = randomUUID();
          const a = await manualSnapshot(db, request),
            b = await manualSnapshot(db, request);
          assert.equal(a.id, b.id);
          const stored = await readSnapshot(db, a.id);
          assert.equal(stored.payload.schemaVersion, 2);
          for (const table of [
            "parties",
            "guests",
            "events",
            "invitations",
            "settings",
            "audit",
            "receipts",
          ])
            assert(Array.isArray(stored.payload[table]));
          await assert.rejects(
            () =>
              db`UPDATE wedding_rsvp.snapshots SET checksum='bad' WHERE id=${a.id}`,
          );
          await assert.rejects(
            () => db`DELETE FROM wedding_rsvp.snapshots WHERE id=${a.id}`,
          );
        },
      );
      await t.test(
        "before/after snapshots are atomic and an import retry does not duplicate them",
        async () => {
          const source = csv("first", "first-guest");
          const x = await upload(source);
          await commitImport(
            db,
            source,
            [],
            x.preview.revision,
            x.preview.hash,
            x.requestId,
          );
          const records =
            await db`SELECT id,kind FROM wedding_rsvp.snapshots WHERE operation_id=${x.requestId}`;
          assert.equal(records.length, 2);
          const before = await readSnapshot(db, x.id);
          assert.equal(before.payload.guests.length, 0);
          const after = await readSnapshot(
            db,
            records.find((r) => r.kind === "after_import")!.id,
          );
          assert.equal(after.payload.guests.length, 1);
          assert.equal(after.payload.receipts.length, 1);
        },
      );
      await t.test(
        "rollback restores imported names but preserves a newer decline, timestamps and receipts",
        async () => {
          const x = await upload(
            csv("first", "first-guest", "Alec", "Wrong household"),
          );
          await respond("first", "first-guest");
          const saved = await captureRsvp(db);
          await undo(x.id);
          const live = await captureRsvp(db);
          assert.deepEqual(live.invitations, saved.invitations);
          assert.deepEqual(live.receipts, saved.receipts);
          assert.equal(
            live.guests.find((g) => g.id === "first-guest")!.first_name,
            "Alex",
          );
          assert.equal(
            live.parties.find((p) => p.id === "first")!.display_name,
            "The Morgan family",
          );
          assert(live.audit.length > saved.audit.length);
          assert.equal((await settings(db)).mode, "declines_only");
          const count = (await snapshotList(db)).length;
          await commitRollback(db, x.id, -1, "retry-after-success");
          assert.equal((await snapshotList(db)).length, count);
        },
      );
      await t.test(
        "new records are archived, disappear from lookup/admin and can be imported again with stable IDs",
        async () => {
          const source = csv("accident", "accidental-guest", "Taylor");
          const x = await upload(source);
          await undo(x.id);
          assert.equal(
            (await lookup(db, "Taylor", "Morgan")).status,
            "not_found",
          );
          assert(
            !(await adminData(db)).guests.some(
              (g) => g.guest_id === "accidental-guest",
            ),
          );
          await assert.rejects(() => party(db, "accident"), /not found/);
          const [g] =
            await db`SELECT * FROM wedding_rsvp.guests WHERE id='accidental-guest'`;
          assert(g.archived_at);
          await assert.rejects(
            () =>
              db`DELETE FROM wedding_rsvp.guests WHERE id='accidental-guest'`,
          );
          const x2 = await upload(source);
          assert.equal(x2.preview.guestsAdded, 1);
          assert.equal(
            (await party(db, "accident")).guests[0].id,
            "accidental-guest",
          );
          assert.equal(
            (
              await db`SELECT * FROM wedding_rsvp.guests WHERE id='accidental-guest'`
            ).length,
            1,
          );
          // Restoring a pre-import archive state must work as well as archiving new rows.
          await undo(x2.id);
          assert.equal(
            (await lookup(db, "Taylor", "Morgan")).status,
            "not_found",
          );
        },
      );
      await t.test(
        "new invitation with a response blocks rollback without any partial writes",
        async () => {
          const x = await upload(
            csv(
              "first",
              "first-guest",
              "Alex",
              "The Morgan family",
              "wedding;brunch",
            ),
          );
          await respond("first", "first-guest", "brunch");
          const p = await previewRollback(db, x.id);
          assert(p.conflicts.some((c) => c.includes("response")));
          const before = await captureRsvp(db);
          await assert.rejects(
            () => commitRollback(db, x.id, p.revision, p.hash),
            /blocked/,
          );
          const after = await captureRsvp(db);
          assert.deepEqual(after.guests, before.guests);
          assert.deepEqual(after.invitations, before.invitations);
          assert.deepEqual(after.audit, before.audit);
          await assert.rejects(
            () =>
              db`UPDATE wedding_rsvp.invitations SET archived_at=now() WHERE guest_id='first-guest' AND event_id='brunch'`,
          );
        },
      );
      await t.test(
        "stale rollback preview cannot overwrite a response saved after preview",
        async () => {
          const x = await upload(
            csv("first", "first-guest", "Alex", "Temporary display name"),
          );
          const p = await previewRollback(db, x.id);
          await respond("first", "first-guest");
          await assert.rejects(
            () => commitRollback(db, x.id, p.revision, p.hash),
            /changed/,
          );
          assert.equal(
            (await party(db, "first")).displayName,
            "Temporary display name",
          );
          await undo(x.id);
        },
      );
      await t.test(
        "conflicting edits are surfaced instead of being overwritten",
        async () => {
          const x = await upload(csv("first", "first-guest", "ImportedName"));
          await db`UPDATE wedding_rsvp.guests SET first_name='LaterName',normalized_first_name='latername' WHERE id='first-guest'`;
          const p = await previewRollback(db, x.id);
          assert(p.conflicts.some((c) => c.includes("first_name")));
          await assert.rejects(
            () => commitRollback(db, x.id, p.revision, p.hash),
            /blocked/,
          );
          assert.equal(
            (await party(db, "first")).guests[0].firstName,
            "LaterName",
          );
        },
      );
      await t.test("later imports must be undone first", async () => {
        const first = await upload(csv("order", "order-guest", "One"));
        const second = await upload(csv("order", "order-guest", "Two"));
        await assert.rejects(
          () => previewRollback(db, first.id),
          /later imports/,
        );
        await undo(second.id);
        assert.equal((await party(db, "order")).guests[0].firstName, "One");
        await undo(first.id);
        await assert.rejects(() => party(db, "order"));
      });
      await t.test(
        "snapshot failure aborts the complete import transaction",
        async () => {
          await db.unsafe(
            `CREATE FUNCTION wedding_rsvp.fail_after_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.kind='after_import' THEN RAISE EXCEPTION 'test snapshot failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER fail_after_snapshot BEFORE INSERT ON wedding_rsvp.snapshots FOR EACH ROW EXECUTE FUNCTION wedding_rsvp.fail_after_snapshot();`,
          );
          const source = csv("failed", "failed-guest");
          const p = await previewImport(db, source, []);
          const id = randomUUID();
          await assert.rejects(
            () => commitImport(db, source, [], p.revision, p.hash, id),
            /snapshot failure/,
          );
          assert.equal(
            (
              await db`SELECT * FROM wedding_rsvp.guests WHERE id='failed-guest'`
            ).length,
            0,
          );
          assert.equal(
            (
              await db`SELECT * FROM wedding_rsvp.snapshots WHERE operation_id=${id}`
            ).length,
            0,
          );
          assert.equal(
            (await db`SELECT * FROM wedding_rsvp.receipts WHERE id=${id}`)
              .length,
            0,
          );
          await db.unsafe(
            "DROP TRIGGER fail_after_snapshot ON wedding_rsvp.snapshots",
          );
        },
      );
    } finally {
      await db.end();
      await root.unsafe(`DROP DATABASE ${name}`);
      await root.end();
    }
  },
);
