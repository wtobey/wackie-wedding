import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
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
    ['/dawn-ranch-orchard.webp', 'The Orchard'],
    ['/dawn-ranch-river.jpg', 'By the river'],
    [wedding.cabinPhoto, 'Wake up in a cozy cottage'],
    ['/dawn-ranch-camping.jpg', 'A little glamping'],
    ['/dawn-ranch-pool.jpg', 'Poolside among the redwoods'],
  ].map(([imageUrl, caption], index) => ({ id: `venue-${index}`, imageUrl, caption, alt: caption, collection: 'venue', photoDate: null, included: true }));
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
  await mkdir(dataDirectory, { recursive: true });
  const temporary = `${libraryPath}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(library, null, 2), { mode: 0o600 });
  await rename(temporary, libraryPath);
}
export async function readLibrary(): Promise<PhotoLibrary> {
  try { return JSON.parse(await readFile(libraryPath, 'utf8')); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  return exclusive(async () => {
    try { return JSON.parse(await readFile(libraryPath, 'utf8')); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    const library = await initialLibrary(); await writeLibrary(library); return library;
  });
}
