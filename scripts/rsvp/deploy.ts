// Explicit deployment job only. Not part of ordinary builds or any HTTP route.
import { createHash, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";
import { applyMigrations } from "./migrations";
import { csvSource, importRows } from "../../lib/rsvp/csv";
import {
  previewImport,
  commitImport,
  settings,
  setMode,
  lookup,
} from "../../lib/rsvp/service";

const digest = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");
async function main() {
  if (
    process.env.VERCEL !== "1" ||
    process.env.VERCEL_ENV !== "production" ||
    process.env.RSVP_DEPLOY_JOB !== "apply"
  )
    throw new Error(
      "Run only as an explicitly requested Vercel production deployment job.",
    );
  const connection = process.env.RSVP_DATABASE_URL || process.env.POSTGRES_URL;
  const storageUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!connection || !storageUrl || !key)
    throw new Error(
      "Production database and private Storage credentials are required.",
    );
  const csv = csvSource(
    Buffer.from(process.env.RSVP_DEPLOY_CSV_BASE64 || "", "base64").toString(
      "utf8",
    ),
  );
  if (digest(csv) !== process.env.RSVP_DEPLOY_CSV_SHA256)
    throw new Error("Guest-list checksum mismatch.");
  const events = ["wedding", "welcome-party", "brunch"];
  const rows = importRows(csv, events);
  if (rows.length !== Number(process.env.RSVP_DEPLOY_EXPECTED_GUESTS))
    throw new Error("Unexpected guest count.");
  const storage = createClient(storageUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  }).storage;
  const bucket = "wedding-rsvp-backups";
  const existing = await storage.getBucket(bucket);
  if (!existing.data) {
    const result = await storage.createBucket(bucket, {
      public: false,
      allowedMimeTypes: ["application/json"],
      fileSizeLimit: 50 * 1024 * 1024,
    });
    if (result.error)
      throw new Error("Could not create private RSVP snapshot bucket.");
  } else if (existing.data.public)
    throw new Error("RSVP snapshot bucket must be private.");
  const db = postgres(connection, {
    max: 1,
    prepare: false,
    connect_timeout: 10,
    connection: { statement_timeout: 60000, application_name: "rsvp-deploy" },
  });
  const run =
    new Date().toISOString().replace(/[:.]/g, "-") + "-" + randomUUID();
  async function snapshot(stage: string) {
    const data = await db.begin(
      "isolation level repeatable read read only",
      async (tx) => {
        const tables =
          await tx`SELECT tablename FROM pg_tables WHERE schemaname='wedding_rsvp' ORDER BY tablename`;
        const records: Record<string, unknown> = {};
        for (const table of tables)
          records[table.tablename] =
            await tx`SELECT * FROM ${tx("wedding_rsvp." + table.tablename)}`;
        const [hasLibrary] =
          await tx`SELECT to_regclass('wedding_admin.library') AS ready`;
        const library = hasLibrary.ready
          ? await tx`SELECT * FROM wedding_admin.library ORDER BY id`
          : [];
        return {
          createdAt: new Date().toISOString(),
          kind: "RSVP data snapshot; not a full database or photo-object backup",
          tables: records,
          photoLibrary: library,
        };
      },
    );
    const bytes = Buffer.from(JSON.stringify(data));
    const path = `${run}/${stage}.json`;
    const upload = await storage
      .from(bucket)
      .upload(path, bytes, { contentType: "application/json", upsert: false });
    if (upload.error)
      throw new Error("Could not save RSVP snapshot; stopping.");
    const downloaded = await storage.from(bucket).download(path);
    if (
      !downloaded.data ||
      digest(Buffer.from(await downloaded.data.arrayBuffer())) !== digest(bytes)
    )
      throw new Error("RSVP snapshot verification failed.");
    console.log(
      JSON.stringify({
        snapshot: path,
        bucket,
        bytes: bytes.length,
        sha256: digest(bytes),
      }),
    );
    return data;
  }
  try {
    const before = await snapshot("before");
    console.log(JSON.stringify({ migrations: await applyMigrations(db) }));
    const preview = await previewImport(db, csv, events);
    console.log(JSON.stringify({ importPreview: preview }));
    if (
      preview.guestsUpdated ||
      preview.partiesUpdated ||
      preview.warnings.length
    )
      throw new Error(
        "Existing guest changes need review; import not applied.",
      );
    await commitImport(
      db,
      csv,
      events,
      preview.revision,
      preview.hash,
      randomUUID(),
    );
    const invitations =
      await db`SELECT guest_id,event_id,attendance FROM wedding_rsvp.invitations WHERE guest_id IN ${db(rows.map((r) => r.guestId))}`;
    if (invitations.length < rows.length * events.length)
      throw new Error("Imported invitations are incomplete.");
    const after = await snapshot("after-import");
    const oldInvitations = before.tables.invitations;
    const newInvitations = after.tables.invitations;
    if (Array.isArray(oldInvitations) && Array.isArray(newInvitations)) {
      for (const prior of oldInvitations) {
        const current = newInvitations.find((row) => row.id === prior.id);
        if (JSON.stringify(current) !== JSON.stringify(prior))
          throw new Error(
            "An existing response changed; review before promotion.",
          );
      }
    }
    if (
      JSON.stringify(before.photoLibrary) !== JSON.stringify(after.photoLibrary)
    )
      throw new Error(
        "Photo metadata changed during deployment; review before promotion.",
      );
    const repeat = await previewImport(db, csv, events);
    if (repeat.guestsAdded || repeat.partiesAdded || repeat.invitationsAdded)
      throw new Error("Import verification failed.");
    await setMode(db, "declines_only", (await settings(db)).revision);
    const check = await lookup(db, "Bruce", "Tobey");
    if (check.status !== "found" || check.party.guests.length !== 3)
      throw new Error("Production lookup verification failed.");
    await snapshot("ready");
    console.log(
      JSON.stringify({
        rsvpReady: true,
        guests: rows.length,
        households: new Set(rows.map((r) => r.partyId)).size,
        mode: (await settings(db)).mode,
        photoLibraryUnchanged: true,
      }),
    );
  } finally {
    await db.end();
  }
}
main().catch((error) => {
  console.error(
    "RSVP deployment stopped:",
    error instanceof Error ? error.message : "Unknown error",
  );
  process.exitCode = 1;
});
