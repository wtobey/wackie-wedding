import { randomUUID } from "node:crypto";
import type postgres from "postgres";
import type { Db } from "./database";
import { hash } from "./csv";
import { RsvpError } from "./validation";
import type { RollbackPlan, SnapshotSummary } from "./types";

type Row = Record<string, string | number | boolean | null> & { id: string };
type Table = "parties" | "guests" | "invitations";
export type SnapshotData = {
  schemaVersion: number;
  exportedAt: string;
  settings: Row[];
  parties: Row[];
  guests: Row[];
  invitations: Row[];
  events: Row[];
  audit: Row[];
  receipts: Row[];
};
type Change = {
  table: Table;
  id: string;
  values: Record<string, string | number | boolean | null>;
  archive: boolean;
};
const fields: Record<Table, string[]> = {
  parties: ["display_name", "greeting", "archived_at"],
  guests: [
    "first_name",
    "last_name",
    "preferred_name",
    "normalized_first_name",
    "normalized_last_name",
    "archived_at",
  ],
  invitations: ["archived_at"],
};
export function snapshotChecksum(value: unknown): string {
  const canonical = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(canonical)
      : v !== null && typeof v === "object"
        ? Object.fromEntries(
            Object.entries(v)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([k, x]) => [k, canonical(x)]),
          )
        : v;
  return hash(canonical(value));
}
// JSON serialization also normalizes PostgreSQL timestamps before hashing/comparing.
export async function captureRsvp(db: Db): Promise<SnapshotData> {
  return JSON.parse(
    JSON.stringify({
      schemaVersion: 2,
      exportedAt: new Date().toISOString(),
      settings: await db`SELECT * FROM wedding_rsvp.settings ORDER BY id`,
      parties: await db`SELECT * FROM wedding_rsvp.parties ORDER BY id`,
      guests: await db`SELECT * FROM wedding_rsvp.guests ORDER BY id`,
      invitations: await db`SELECT * FROM wedding_rsvp.invitations ORDER BY id`,
      events: await db`SELECT * FROM wedding_rsvp.events ORDER BY id`,
      audit: await db`SELECT * FROM wedding_rsvp.audit_log ORDER BY id`,
      receipts: await db`SELECT * FROM wedding_rsvp.receipts ORDER BY id`,
    }),
  );
}
export async function saveSnapshot(
  db: Db,
  kind: SnapshotSummary["kind"],
  operationId: string,
) {
  const payload = await captureRsvp(db);
  const id = randomUUID();
  await db`INSERT INTO wedding_rsvp.snapshots(id,kind,operation_id,revision,payload,checksum)
    VALUES(${id},${kind},${operationId},${Number(payload.settings[0].revision)},${db.json(payload as unknown as postgres.JSONValue)},${snapshotChecksum(payload)})`;
  return id;
}
export async function snapshotList(db: Db): Promise<SnapshotSummary[]> {
  const rows =
    await db`SELECT s.id,s.created_at,s.kind,s.operation_id,s.revision,
    r.import_id IS NOT NULL AS rolled_back,
    s.kind='before_import' AND s.operation_id=(SELECT operation_id FROM wedding_rsvp.snapshots a WHERE kind='after_import' AND NOT EXISTS (SELECT 1 FROM wedding_rsvp.import_rollbacks r WHERE r.import_id=a.operation_id) ORDER BY revision DESC LIMIT 1) AS can_rollback
    FROM wedding_rsvp.snapshots s LEFT JOIN wedding_rsvp.import_rollbacks r ON r.import_id=s.operation_id ORDER BY s.created_at DESC,s.kind LIMIT 100`;
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.created_at.toISOString(),
    kind: r.kind,
    operationId: r.operation_id,
    revision: r.revision,
    rolledBack: r.rolled_back,
    canRollback: r.can_rollback,
  }));
}
export async function readSnapshot(db: Db, id: string) {
  const [row] = await db`SELECT * FROM wedding_rsvp.snapshots WHERE id=${id}`;
  if (!row) throw new RsvpError("Snapshot not found.", 404);
  if (snapshotChecksum(row.payload) !== row.checksum)
    throw new RsvpError(
      "Snapshot verification failed. Nothing has been changed.",
      409,
    );
  return row;
}
export async function manualSnapshot(db: postgres.Sql, requestId: string) {
  return db.begin(async (tx) => {
    await tx`SELECT id FROM wedding_rsvp.settings WHERE id=1 FOR UPDATE`;
    const [previous] =
      await tx`SELECT id FROM wedding_rsvp.snapshots WHERE operation_id=${requestId} AND kind='manual'`;
    return {
      id: previous?.id || (await saveSnapshot(tx, "manual", requestId)),
    };
  });
}
const hasResponse = (row: Row) =>
  ["attendance", "responded_at", "meal_choice", "dietary_restrictions"].some(
    (k) => row[k] !== null && row[k] !== undefined,
  );

// Undo only fields changed by this import. Response values and unrelated changes stay live.
export function compareImport(
  before: SnapshotData,
  after: SnapshotData,
  current: SnapshotData,
) {
  const changes: Change[] = [];
  const conflicts: string[] = [];
  const revision = Number(current.settings[0].revision);
  for (const table of ["parties", "guests", "invitations"] as const) {
    const oldRows = new Map(before[table].map((r) => [r.id, r]));
    const liveRows = new Map(current[table].map((r) => [r.id, r]));
    for (const imported of after[table]) {
      const old = oldRows.get(imported.id);
      const live = liveRows.get(imported.id);
      const changed = fields[table].filter(
        (k) => !old || old[k] !== imported[k],
      );
      if (!changed.length) continue;
      if (!live) {
        conflicts.push(
          `${table} ${imported.id} is missing. Review it before rolling back.`,
        );
        continue;
      }
      const values: Change["values"] = {};
      for (const key of changed) {
        if (live[key] !== imported[key])
          conflicts.push(
            `${table} ${live.id}: ${key} changed after this import.`,
          );
        if (old) values[key] = old[key];
      }
      // For newly added rows also guard fields that an import itself cannot edit.
      if (
        !old &&
        table === "guests" &&
        ["party_id", "is_unnamed_plus_one", "import_key"].some(
          (k) => live[k] !== imported[k],
        )
      )
        conflicts.push(`Guest ${live.id} was changed after this import.`);
      if (
        !old &&
        table === "invitations" &&
        ["guest_id", "event_id"].some((k) => live[k] !== imported[k])
      )
        conflicts.push(`Invitation ${live.id} was changed after this import.`);
      changes.push({ table, id: live.id, values, archive: !old });
    }
  }
  const archiving = (c: Change) => c.archive || c.values.archived_at != null;
  const archivedIds = (table: Table) =>
    new Set(
      changes.filter((c) => c.table === table && archiving(c)).map((c) => c.id),
    );
  const invitations = archivedIds("invitations"),
    guests = archivedIds("guests"),
    parties = archivedIds("parties");
  for (const i of current.invitations) {
    if (invitations.has(i.id) && hasResponse(i))
      conflicts.push(
        `Invitation ${i.id} has a response. Rollback would hide it.`,
      );
    if (
      !i.archived_at &&
      guests.has(String(i.guest_id)) &&
      !invitations.has(i.id)
    )
      conflicts.push(
        `Guest ${i.guest_id} has an invitation added after this import.`,
      );
  }
  for (const g of current.guests) {
    if (!g.archived_at && parties.has(String(g.party_id)) && !guests.has(g.id))
      conflicts.push(
        `Party ${g.party_id} has a guest added after this import.`,
      );
  }
  return { changes, conflicts: [...new Set(conflicts)], revision };
}
async function rollbackPlan(db: Db, snapshotId: string) {
  const before = await readSnapshot(db, snapshotId);
  if (before.kind !== "before_import")
    throw new RsvpError("Choose a snapshot taken before an import.");
  const [afterRow] =
    await db`SELECT id FROM wedding_rsvp.snapshots WHERE operation_id=${before.operation_id} AND kind='after_import'`;
  if (!afterRow)
    throw new RsvpError("This import has no completed snapshot.", 409);
  const [latest] =
    await db`SELECT operation_id FROM wedding_rsvp.snapshots s WHERE kind='after_import' AND NOT EXISTS (SELECT 1 FROM wedding_rsvp.import_rollbacks r WHERE r.import_id=s.operation_id) ORDER BY revision DESC LIMIT 1`;
  if (latest?.operation_id !== before.operation_id)
    throw new RsvpError(
      "Undo later imports first, then preview this import again.",
      409,
    );
  const after = await readSnapshot(db, afterRow.id);
  const current = await captureRsvp(db);
  const diff = compareImport(before.payload, after.payload, current);
  const summary: RollbackPlan = {
    snapshotId,
    revision: diff.revision,
    hash: hash({
      snapshotId,
      revision: diff.revision,
      changes: diff.changes,
      conflicts: diff.conflicts,
    }),
    partiesRestored: diff.changes.filter(
      (c) => c.table === "parties" && !c.archive && !c.values.archived_at,
    ).length,
    guestsRestored: diff.changes.filter(
      (c) => c.table === "guests" && !c.archive && !c.values.archived_at,
    ).length,
    partiesArchived: diff.changes.filter(
      (c) => c.table === "parties" && (c.archive || c.values.archived_at),
    ).length,
    guestsArchived: diff.changes.filter(
      (c) => c.table === "guests" && (c.archive || c.values.archived_at),
    ).length,
    invitationsArchived: diff.changes.filter(
      (c) => c.table === "invitations" && (c.archive || c.values.archived_at),
    ).length,
    responsesPreserved: current.invitations.filter(hasResponse).length,
    conflicts: diff.conflicts,
  };
  return {
    summary,
    changes: diff.changes,
    importId: String(before.operation_id),
  };
}
export async function previewRollback(db: postgres.Sql, snapshotId: string) {
  return db.begin(
    "isolation level repeatable read read only",
    async (tx) => (await rollbackPlan(tx, snapshotId)).summary,
  );
}
export async function commitRollback(
  db: postgres.Sql,
  snapshotId: string,
  revision: number,
  expectedHash: string,
) {
  return db.begin(async (tx) => {
    await tx`SELECT id FROM wedding_rsvp.settings WHERE id=1 FOR UPDATE`;
    await tx`SELECT set_config('wedding_rsvp.actor', 'admin:rollback', true)`;
    const before = await readSnapshot(tx, snapshotId);
    const [previous] =
      await tx`SELECT snapshot_id FROM wedding_rsvp.import_rollbacks WHERE import_id=${before.operation_id}`;
    if (previous) return { restored: true, snapshotId: previous.snapshot_id };
    const plan = await rollbackPlan(tx, snapshotId);
    if (
      plan.summary.revision !== revision ||
      plan.summary.hash !== expectedHash
    )
      throw new RsvpError(
        "The RSVP data changed. Preview the rollback again.",
        409,
      );
    if (plan.summary.conflicts.length)
      throw new RsvpError(
        "Rollback is blocked to protect newer changes. Review the conflicts first.",
        409,
      );
    const rescue = await saveSnapshot(tx, "before_rollback", plan.importId);
    // Children are archived first; nothing is deleted, and all changes remain audited.
    const touchedParties = new Set<string>();
    for (const table of ["invitations", "guests", "parties"] as const) {
      for (const c of plan.changes.filter((c) => c.table === table)) {
        const values = {
          ...c.values,
          ...(c.archive ? { archived_at: new Date().toISOString() } : {}),
          updated_at: new Date().toISOString(),
        };
        await tx`UPDATE ${tx("wedding_rsvp." + table)} SET ${tx(values)} WHERE id=${c.id}`;
        if (table === "parties") touchedParties.add(c.id);
        if (table === "guests") {
          const [g] =
            await tx`SELECT party_id FROM wedding_rsvp.guests WHERE id=${c.id}`;
          touchedParties.add(g.party_id);
        }
        if (table === "invitations") {
          const [g] =
            await tx`SELECT g.party_id FROM wedding_rsvp.guests g JOIN wedding_rsvp.invitations i ON i.guest_id=g.id WHERE i.id=${c.id}`;
          touchedParties.add(g.party_id);
        }
      }
    }
    for (const p of touchedParties)
      await tx`UPDATE wedding_rsvp.parties SET revision=revision+1,updated_at=now() WHERE id=${p}`;
    await tx`UPDATE wedding_rsvp.settings SET revision=revision+1 WHERE id=1`;
    await tx`INSERT INTO wedding_rsvp.import_rollbacks(import_id,snapshot_id) VALUES(${plan.importId},${rescue})`;
    return { restored: true, snapshotId: rescue };
  });
}
