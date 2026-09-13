import { validCrop } from '@/lib/wedding-admin/crop';
import { LibraryConflict } from '@/lib/wedding-admin/database';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { isAdmin, sameOrigin } from '@/lib/wedding-admin/auth';
import { exclusive, readLibrary, saveMedia, deleteMedia, writeLibrary } from '@/lib/wedding-admin/store';
import { photoTimestamp } from '@/lib/wedding-timeline';
import { removeLibraryPhoto } from '@/lib/wedding-admin/delete';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
async function bounded(request: Request, limit: number) {
  if (!request.body) throw new Error('No request body.');
  const reader = request.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
  while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > limit) { await reader.cancel(); throw new Error('The upload is too large. Maximum 4 MB per photo.'); } chunks.push(value); }
  return new Request(request.url, { method: 'POST', headers: request.headers, body: Buffer.concat(chunks) });
}
export async function GET() {
  if (!await isAdmin()) return new Response(null, { status: 401 });
  try { return Response.json(await readLibrary(), { headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { console.error('Photo library unavailable', error instanceof Error ? error.message : 'Unknown storage error'); return Response.json({ error: 'The photo library could not be loaded. Please retry.' }, { status: 503 }); }
}
export async function DELETE(request: Request) {
  if (!await isAdmin()) return Response.json({ error: 'Your admin session expired. Sign in again.' }, { status: 401 });
  if (!sameOrigin(request)) return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
  try {
    const body = await (await bounded(request, 4096)).json();
    await readLibrary();
    return await exclusive(async () => {
      const updated = removeLibraryPhoto(await readLibrary(), body?.id, body?.revision);
      // Keep stored image files intact; other records may reference the same asset.
      await writeLibrary(updated);
      return Response.json(updated);
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Could not delete the photo.' }, { status: error instanceof LibraryConflict ? 409 : 400 });
  }
}
export async function PUT(request: Request) {
  if (!await isAdmin()) return new Response(null, { status: 401 });
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  try {
    const body = await (await bounded(request, 4 * 1024 * 1024)).json();
    if (!Array.isArray(body.photos) || !Number.isSafeInteger(body.revision)) throw new Error('Invalid photo list.');
    await readLibrary();
    return await exclusive(async () => {
      const current = await readLibrary();
      if (current.revision !== body.revision) return Response.json({ error: 'The library changed in another window. Reload before saving.' }, { status: 409 });
      if (body.photos.length !== current.photos.length) throw new Error('The photo list is incomplete. Reload and try again.');
      const ids = new Set<string>();
      const photos = body.photos.map((item: Record<string, unknown>) => {
        const existing = current.photos.find(photo => photo.id === item.id);
        if (!existing || ids.has(existing.id)) throw new Error('Invalid or duplicate photo.');
        ids.add(existing.id);
        if (typeof item.caption !== 'string' || item.caption.length > 500 || typeof item.alt !== 'string' || item.alt.length > 500 || typeof item.included !== 'boolean') throw new Error('Please check the photo details.');
        if (item.photoDate !== null && (typeof item.photoDate !== 'string' || photoTimestamp(item.photoDate) === null)) throw new Error('Please enter a valid photo date.');
        if (item.crop !== undefined && !validCrop(item.crop)) throw new Error('Please check the crop position and zoom.');
        const crop = item.crop === undefined ? existing.crop : { x: item.crop.x, y: item.crop.y, zoom: item.crop.zoom };
        return { ...existing, crop, caption: item.caption, alt: item.alt, included: item.included, photoDate: item.photoDate as string | null };
      });
      const updated = { revision: current.revision + 1, photos }; await writeLibrary(updated); return Response.json(updated);
    });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : 'Could not save changes.' }, { status: error instanceof LibraryConflict ? 409 : 400 }); }
}
export async function POST(request: Request) {
  if (!await isAdmin()) return new Response(null, { status: 401 });
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  let destination: string | undefined;
  try {
    const form = await (await bounded(request, 4 * 1024 * 1024 + 65536)).formData();
    const file = form.get('file'); const collection = form.get('collection'); const replaceId = form.get('replaceId');
    const photoDate = form.get('photoDate');
    if (photoDate !== null && (typeof photoDate !== 'string' || photoTimestamp(photoDate) === null)) throw new Error('Please enter a valid photo date.');
    if (!(file instanceof File) || file.size > 4 * 1024 * 1024 || !['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Choose a JPG, PNG, or WebP image up to 4 MB.');
    if (collection !== 'gallery' && collection !== 'venue') throw new Error('Choose a photo collection.');
    const bytes = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 40000000 }).rotate().resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 88 }).toBuffer();
    const filename = `${randomUUID()}.webp`;
    destination = filename; await saveMedia(filename, bytes);
    await readLibrary();
    return await exclusive(async () => {
      const current = await readLibrary();
      const imageUrl = `/api/wedding/media/${filename}`;
      if (replaceId) {
        const existing = current.photos.find(photo => photo.id === replaceId && photo.collection === collection);
        if (!existing) throw new Error('Photo not found.');
        existing.imageUrl = imageUrl;
        existing.photoDate ??= photoDate as string | null;
        delete existing.crop;
      } else current.photos.push({ id: randomUUID(), collection, imageUrl, caption: file.name.replace(/\.[^.]+$/, '').slice(0, 500), alt: '', photoDate: photoDate as string | null, included: false });
      current.revision++; await writeLibrary(current); return Response.json(current);
    });
  } catch (error) {
    if (destination) await deleteMedia(destination).catch(() => {});
    return Response.json({ error: error instanceof Error ? error.message : 'Upload failed. Please retry.' }, { status: error instanceof LibraryConflict ? 409 : 400 });
  }
}
