import postgres from 'postgres';
import type { PhotoLibrary } from './types';

const connection = process.env.POSTGRES_URL;
const sql = connection ? postgres(connection, { max: 1, prepare: false, idle_timeout: 20, connect_timeout: 10 }) : null;
export const usesDatabase = Boolean(sql);
export class LibraryConflict extends Error {
  constructor() { super('The library changed in another window. Reload before saving.'); }
}
let ready: Promise<unknown> | undefined;
async function database() {
  if (!sql) throw new Error('Photo database is not configured.');
  if (!ready) ready = sql.begin(async tx => {
    await tx`SELECT pg_advisory_xact_lock(735290104)`;
    await tx`CREATE SCHEMA IF NOT EXISTS wedding_admin`;
    await tx`REVOKE ALL ON SCHEMA wedding_admin FROM PUBLIC`;
    await tx`CREATE TABLE IF NOT EXISTS wedding_admin.library (id integer PRIMARY KEY CHECK (id = 1), revision integer NOT NULL, photos jsonb NOT NULL)`;
    await tx`CREATE TABLE IF NOT EXISTS wedding_admin.media (name text PRIMARY KEY, bytes bytea NOT NULL)`;
  }).catch(error => { ready = undefined; throw error; });
  await ready;
  return sql;
}
export async function databaseLibrary(seed: () => Promise<PhotoLibrary>): Promise<PhotoLibrary> {
  const db = await database();
  let rows = await db`SELECT revision, photos FROM wedding_admin.library WHERE id = 1`;
  if (!rows.length) {
    const initial = await seed();
    await db`INSERT INTO wedding_admin.library (id, revision, photos) VALUES (1, ${initial.revision}, ${db.json(initial.photos)}) ON CONFLICT (id) DO NOTHING`;
    rows = await db`SELECT revision, photos FROM wedding_admin.library WHERE id = 1`;
  }
  return { revision: rows[0].revision, photos: rows[0].photos };
}
export async function saveDatabaseLibrary(library: PhotoLibrary) {
  const db = await database();
  const rows = await db`UPDATE wedding_admin.library SET revision = ${library.revision}, photos = ${db.json(library.photos)} WHERE id = 1 AND revision = ${library.revision - 1} RETURNING id`;
  if (!rows.length) throw new LibraryConflict();
}
export async function saveDatabaseMedia(name: string, bytes: Buffer) {
  const db = await database();
  await db`INSERT INTO wedding_admin.media (name, bytes) VALUES (${name}, ${bytes})`;
}
export async function readDatabaseMedia(name: string): Promise<Buffer> {
  const db = await database();
  const rows = await db`SELECT bytes FROM wedding_admin.media WHERE name = ${name}`;
  if (!rows.length) throw new Error('Photo not found.');
  return rows[0].bytes;
}
export async function deleteDatabaseMedia(name: string) {
  const db = await database();
  await db`DELETE FROM wedding_admin.media WHERE name = ${name}`;
}
