import postgres from "postgres";
import { backup, databaseUrl } from "./backup";
import { applyMigrations } from "./migrations";
async function main() {
  const connection = databaseUrl(),
    url = new URL(connection);
  if (
    !["localhost", "127.0.0.1"].includes(url.hostname) &&
    process.env.RSVP_ALLOW_REMOTE_MIGRATION !== "true"
  )
    throw new Error(
      "Remote migration requires RSVP_ALLOW_REMOTE_MIGRATION=true after reviewing the backup plan.",
    );
  const path = await backup(connection);
  console.log(`Pre-migration backup: ${path}`);
  const db = postgres(connection, { max: 1, prepare: false });
  try {
    for (const name of await applyMigrations(db))
      console.log(`Applied ${name}`);
  } finally {
    await db.end();
  }
  console.log(
    "RSVP schema ready. Existing schemas were not changed. RSVP starts closed.",
  );
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Migration failed.");
  process.exitCode = 1;
});
