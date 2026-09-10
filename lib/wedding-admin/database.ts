import postgres from 'postgres';
import type { PhotoLibrary } from './types';

const connection = process.env.POSTGRES_URL;
export const usesDatabase = Boolean(connection);
export class LibraryConflict extends Error {
  constructor() { super('The library changed in another window. Reload before saving.'); }
}
// A frozen serverless instance can retain an unusable TCP connection. Give each
// storage operation a bounded connection lifetime and close it before returning.
let schemaReady = false;
async function withDatabase<T>(operation: (db: postgres.Sql) => Promise<T>): Promise<T> {
  if (!connection) throw new Error('Photo database is not configured.');
  const db = postgres(connection, { max: 1, prepare: false, connect_timeout: 5, idle_timeout: 5 });
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      (async () => {
        if (!schemaReady) {
          const rows = await db`SELECT to_regclass('wedding_admin.library') AS library, to_regclass('wedding_admin.media') AS media`;
          if (!rows[0].library || !rows[0].media) await db.begin(async tx => {
            await tx`SET LOCAL lock_timeout = '5s'`;
            await tx`SET LOCAL statement_timeout = '10s'`;
            await tx`SELECT pg_advisory_xact_lock(735290104)`;
            await tx`CREATE SCHEMA IF NOT EXISTS wedding_admin`;
            await tx`REVOKE ALL ON SCHEMA wedding_admin FROM PUBLIC`;
            await tx`CREATE TABLE IF NOT EXISTS wedding_admin.library (id integer PRIMARY KEY CHECK (id = 1), revision integer NOT NULL, photos jsonb NOT NULL)`;
            await tx`CREATE TABLE IF NOT EXISTS wedding_admin.media (name text PRIMARY KEY, bytes bytea NOT NULL)`;
          });
          schemaReady = true;
        }
        return operation(db);
      })(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Photo storage took too long to respond. Please retry.')), 15000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
    await db.end({ timeout: 0 });
  }
}
export async function databaseLibrary(seed: () => Promise<PhotoLibrary>): Promise<PhotoLibrary> {
  return withDatabase(async db => {
  let rows = await db`SELECT revision, photos FROM wedding_admin.library WHERE id = 1`;
  if (!rows.length) {
    const initial = await seed();
    await db`INSERT INTO wedding_admin.library (id, revision, photos) VALUES (1, ${initial.revision}, ${db.json(initial.photos)}) ON CONFLICT (id) DO NOTHING`;
    rows = await db`SELECT revision, photos FROM wedding_admin.library WHERE id = 1`;
  }
  return { revision: rows[0].revision, photos: rows[0].photos };
  });
}
export async function saveDatabaseLibrary(library: PhotoLibrary) {
  return withDatabase(async db => {
  const rows = await db`UPDATE wedding_admin.library SET revision = ${library.revision}, photos = ${db.json(library.photos)} WHERE id = 1 AND revision = ${library.revision - 1} RETURNING id`;
  if (!rows.length) throw new LibraryConflict();
  });
}
export async function saveDatabaseMedia(name: string, bytes: Buffer) {
  return withDatabase(async db => {
  await db`INSERT INTO wedding_admin.media (name, bytes) VALUES (${name}, ${bytes})`;
  });
}
export async function readDatabaseMedia(name: string): Promise<Buffer> {
  return withDatabase(async db => {
  const rows = await db`SELECT bytes FROM wedding_admin.media WHERE name = ${name}`;
  if (!rows.length) throw new Error('Photo not found.');
  return rows[0].bytes;
  });
}
export async function deleteDatabaseMedia(name: string) {
  return withDatabase(async db => {
  await db`DELETE FROM wedding_admin.media WHERE name = ${name}`;
  });
}
