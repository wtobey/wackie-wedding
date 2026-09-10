import { createHash } from 'node:crypto';
import { isAdmin, sameOrigin } from '@/lib/wedding-admin/auth';
import { listDatabaseMedia, readDatabaseMedia, deleteDatabaseMedia } from '@/lib/wedding-admin/database';
import { readLibrary } from '@/lib/wedding-admin/store';
import { readStorageMedia, saveStorageMedia, signedMediaUrl, storageConfigured, uploadBucket } from '@/lib/wedding-admin/storage';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';
const digest = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');

export async function GET() {
  if (!await isAdmin()) return new Response(null, { status: 401 });
  if (!storageConfigured) return Response.json({ error: 'Supabase Storage is not configured.' }, { status: 503 });
  const [files, library] = await Promise.all([listDatabaseMedia(), readLibrary()]);
  return Response.json({ bucket: uploadBucket, files, revision: library.revision, photos: library.photos.length }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  if (!await isAdmin()) return new Response(null, { status: 401 });
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  try {
    const { name, action } = await request.json();
    if (typeof name !== 'string' || !/^[a-f0-9-]{36}\.webp$/.test(name) || !['copy', 'finish'].includes(action)) {
      return Response.json({ error: 'Invalid migration request.' }, { status: 400 });
    }
    const original = await readDatabaseMedia(name);
    if (action === 'copy') await saveStorageMedia(name, original);
    const stored = await readStorageMedia(name);
    if (digest(stored) !== digest(original)) throw new Error('Stored photo checksum does not match. Original retained.');
    const variants = await Promise.all(['thumb', 'small'].map(size => signedMediaUrl(name, size)));
    if (variants.some(url => !url)) throw new Error('A photo preview is missing. Original retained.');
    if (action === 'finish') await deleteDatabaseMedia(name);
    return Response.json({ name, bytes: stored.length, sha256: digest(stored), verified: true, removedFromDatabase: action === 'finish' });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Migration failed. Original retained.' }, { status: 500 });
  }
}
