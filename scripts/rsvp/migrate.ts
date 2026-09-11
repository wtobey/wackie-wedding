import postgres from 'postgres';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { backup, databaseUrl } from './backup';
async function main() {
  const connection = databaseUrl(),
    url = new URL(connection);
  if (
    !['localhost', '127.0.0.1'].includes(url.hostname) &&
    process.env.RSVP_ALLOW_REMOTE_MIGRATION !== 'true'
  )
    throw new Error(
      'Remote migration requires RSVP_ALLOW_REMOTE_MIGRATION=true after reviewing the backup plan.',
    );
  const path = await backup(connection);
  console.log(`Pre-migration backup: ${path}`);
  const db = postgres(connection, { max: 1, prepare: false });
  try {
    await db.begin(async (tx) => {
      await tx`SELECT pg_advisory_xact_lock(62478231)`;
      await tx`CREATE SCHEMA IF NOT EXISTS wedding_rsvp`;
      await tx`CREATE TABLE IF NOT EXISTS wedding_rsvp.migrations(name text PRIMARY KEY, checksum text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())`;
      for (const name of readdirSync('migrations/rsvp')
        .filter((n) => n.endsWith('.sql'))
        .sort()) {
        const sql = readFileSync(`migrations/rsvp/${name}`, 'utf8'),
          checksum = createHash('sha256').update(sql).digest('hex');
        const [previous] =
          await tx`SELECT checksum FROM wedding_rsvp.migrations WHERE name=${name}`;
        if (previous) {
          if (previous.checksum !== checksum)
            throw new Error(
              'An applied migration was modified; add a new migration instead.',
            );
          continue;
        }
        await tx.unsafe(sql);
        await tx`INSERT INTO wedding_rsvp.migrations(name,checksum) VALUES(${name},${checksum})`;
        console.log(`Applied ${name}`);
      }
    });
  } finally {
    await db.end();
  }
  console.log(
    'RSVP schema ready. Existing schemas were not changed. RSVP starts closed.',
  );
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Migration failed.');
  process.exitCode = 1;
});
