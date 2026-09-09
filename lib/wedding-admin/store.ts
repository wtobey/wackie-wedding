import { usesDatabase, databaseLibrary, saveDatabaseLibrary, saveDatabaseMedia, readDatabaseMedia, deleteDatabaseMedia } from './database';
import { mkdir, readFile, writeFile, rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { wedding } from '@/data/wedding_v1';
import type { ManagedPhoto, PhotoLibrary } from './types';
export const dataDirectory = process.env.WEDDING_DATA_DIR || path.join(process.cwd(), '.wedding-data');
export const uploadDirectory = path.join(dataDirectory, 'uploads');
const libraryPath = path.join(dataDirectory, 'photos.json');
// Serializes writes within the single persistent Node server; the revision prevents stale saves.
let queue: Promise<unknown> = Promise.resolve();
export function exclusive<T>(operation: () => Promise<T>): Promise<T> {
  const result = queue.then(operation, operation); queue = result.catch(() => {}); return result;
}
function seedVenue(): ManagedPhoto[] {
  return [
    ['/dawn-ranch-orchard.webp', 'Celebrate in the orchard'],
    ['/dawn-ranch-river.jpg', 'By the river'],
    [wedding.cabinPhoto, 'Wake up in a cozy cottage'],
    ['/dawn-ranch-camping.jpg', 'A little glamping'],
    ['/wedding_v1-assets/venue-river-floating.jpeg', 'Float or paddle down the river'],
    ['/dawn-ranch-pool.jpg', 'Poolside among the redwoods'],
    ['/wedding_v1-assets/venue-fire-smores.jpg', 'Cozy up by the fire'],
  ].map(([imageUrl, caption], index) => ({ id: `venue-${index}`, imageUrl, caption, alt: caption, collection: 'venue', photoDate: null, included: imageUrl !== '/dawn-ranch-river.jpg' }));
}
async function initialLibrary(): Promise<PhotoLibrary> {
  const photos = seedVenue();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key) {
    const client = createClient(url, key, { auth: { persistSession: false } });
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await client.from('polaroids').select('id,image_path,caption,photo_date').order('photo_date', { ascending: true, nullsFirst: false }).order('id').range(offset, offset + 499);
      if (error) throw new Error('Could not import the existing photo library. Please retry.');
      for (const row of data || []) photos.push({ id: `gallery-${row.id}`, collection: 'gallery', imageUrl: client.storage.from('polaroids').getPublicUrl(row.image_path).data.publicUrl, caption: row.caption || '', alt: row.caption || '', photoDate: row.photo_date, included: true });
      if (!data || data.length < 500) break;
    }
  }
  return { revision: 1, photos };
}
export async function writeLibrary(library: PhotoLibrary) {
  if (usesDatabase) return saveDatabaseLibrary(library);
  await mkdir(dataDirectory, { recursive: true });
  const temporary = `${libraryPath}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(library, null, 2), { mode: 0o600 });
  await rename(temporary, libraryPath);
}
export async function readLibrary(): Promise<PhotoLibrary> {
  if (usesDatabase) return databaseLibrary(initialLibrary);
  if (process.env.VERCEL) throw new Error("Production photo database is not configured.");
  try { return JSON.parse(await readFile(libraryPath, 'utf8')); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  return exclusive(async () => {
    try { return JSON.parse(await readFile(libraryPath, 'utf8')); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    const library = await initialLibrary(); await writeLibrary(library); return library;
  });
}

export async function saveMedia(name: string, bytes: Buffer) {
  if (usesDatabase) return saveDatabaseMedia(name, bytes);
  await mkdir(uploadDirectory, { recursive: true });
  await writeFile(path.join(uploadDirectory, name), bytes);
}
export async function readMedia(name: string) {
  if (usesDatabase) return readDatabaseMedia(name);
  return readFile(path.join(uploadDirectory, name));
}
export async function deleteMedia(name: string) {
  if (usesDatabase) return deleteDatabaseMedia(name);
  await unlink(path.join(uploadDirectory, name));
}
