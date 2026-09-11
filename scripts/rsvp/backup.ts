import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  chmodSync,
  createReadStream,
  statSync,
  writeFileSync,
} from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
config({ path: '.env.local', quiet: true });
export function databaseUrl() {
  const value = process.env.RSVP_DATABASE_URL || process.env.POSTGRES_URL;
  if (!value || value === '[SENSITIVE]')
    throw new Error(
      'Set RSVP_DATABASE_URL to a working direct PostgreSQL connection.',
    );
  return value;
}
export function pgEnvironment(connection: string) {
  const u = new URL(connection);
  return {
    ...process.env,
    PGHOST: u.hostname,
    PGPORT: u.port || '5432',
    PGDATABASE: decodeURIComponent(u.pathname.slice(1)),
    PGUSER: decodeURIComponent(u.username),
    PGPASSWORD: decodeURIComponent(u.password),
    PGSSLMODE:
      u.searchParams.get('sslmode') ||
      (['localhost', '127.0.0.1'].includes(u.hostname) ? 'disable' : 'require'),
  };
}
export async function backup(connection = databaseUrl()) {
  process.umask(0o077);
  const directory = resolve(
    process.env.RSVP_BACKUP_DIRECTORY || '.wedding-data/rsvp-backups',
  );
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const path = join(
      directory,
      `database-${new Date().toISOString().replace(/[:.]/g, '-')}.dump`,
    ),
    env = pgEnvironment(connection);
  const dump = spawnSync(
    process.env.PG_DUMP_BIN || 'pg_dump',
    [
      '--format=custom',
      '--no-owner',
      '--no-acl',
      '--no-password',
      `--file=${path}`,
    ],
    { env, encoding: 'utf8' },
  );
  if (dump.status !== 0)
    throw new Error(
      'Database backup failed. No migration will run. Check pg_dump, connection access, and available disk space.',
    );
  chmodSync(path, 0o600);
  const check = spawnSync(
    process.env.PG_RESTORE_BIN || 'pg_restore',
    ['--list', path],
    { encoding: 'utf8' },
  );
  if (check.status !== 0)
    throw new Error(
      'Backup could not be read by pg_restore. No migration will run.',
    );
  const digest = createHash('sha256');
  for await (const chunk of createReadStream(path)) digest.update(chunk);
  const sha256 = digest.digest('hex');
  writeFileSync(
    `${path}.json`,
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        sha256,
        bytes: statSync(path).size,
        archiveReadable: true,
        restoreTested: false,
      },
      null,
      2,
    ),
    { mode: 0o600 },
  );
  return path;
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  backup()
    .then((path) =>
      console.log(
        `Backup created: ${path}\nCopy it to independent private storage. Archive validation is not a restore drill.`,
      ),
    )
    .catch(() => {
      console.error(
        'Backup failed. Check database access and PostgreSQL tools.',
      );
      process.exitCode = 1;
    });
