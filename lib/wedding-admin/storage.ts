import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import type { ManagedPhoto } from './types';

export const uploadBucket = 'wedding-uploads';
export const storageConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL &&
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY));

function storage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('Supabase Storage is not configured.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }).storage;
}

let bucketReady: Promise<void> | undefined;
async function ensureBucket() {
  bucketReady ??= (async () => {
    const api = storage();
    const { data } = await api.getBucket(uploadBucket);
    if (data) {
      if (data.public) throw new Error('The upload bucket must be private.');
      return;
    }
    const { error } = await api.createBucket(uploadBucket, {
      public: false, allowedMimeTypes: ['image/webp'], fileSizeLimit: 10 * 1024 * 1024,
    });
    if (error) {
      // Another concurrent uploader may have created it first.
      const { data: existing } = await api.getBucket(uploadBucket);
      if (!existing || existing.public) throw new Error('Could not initialize photo storage.');
    }
  })().catch(error => { bucketReady = undefined; throw error; });
  return bucketReady;
}

export function storagePaths(name: string) {
  if (!/^[a-f0-9-]{36}\.webp$/.test(name)) throw new Error('Invalid photo filename.');
  return [`originals/${name}`, `thumbnails/${name}`, `small/${name}`];
}

export async function saveStorageMedia(name: string, bytes: Buffer) {
  await ensureBucket();
  const paths = storagePaths(name);
  const previews = await Promise.all([880, 440].map(edge => sharp(bytes).rotate()
    .resize({ width: edge, height: edge, fit: 'inside', withoutEnlargement: true }).webp({ quality: 78 }).toBuffer()));
  const files = [bytes, ...previews];
  // Wait for every upload to settle before callers can clean up a failed upload.
  const results = await Promise.allSettled(paths.map(async (path, index) => {
    const { error } = await storage().from(uploadBucket).upload(path, files[index], {
      contentType: 'image/webp', cacheControl: '3600', upsert: true,
    });
    if (error) throw new Error('Could not save photo to Supabase Storage.');
  }));
  if (results.some(result => result.status === 'rejected')) throw new Error('Could not save all photo sizes to Supabase Storage.');
}

export async function readStorageMedia(name: string) {
  const { data, error } = await storage().from(uploadBucket).download(storagePaths(name)[0]);
  if (error || !data) throw new Error('Photo not found in Supabase Storage.');
  return Buffer.from(await data.arrayBuffer());
}

export async function deleteStorageMedia(name: string) {
  const { error } = await storage().from(uploadBucket).remove(storagePaths(name));
  if (error) throw new Error('Could not remove photo from Supabase Storage.');
}

export async function signedMediaUrl(name: string, size: string | null) {
  const paths = storagePaths(name);
  const path = paths[size === 'small' ? 2 : size === 'thumb' ? 1 : 0];
  const { data, error } = await storage().from(uploadBucket).createSignedUrl(path, 3600);
  if (error || !data) return null;
  return data.signedUrl;
}

// Only call with photos the caller is allowed to see. Stable library URLs stay
// in Postgres; short-lived Storage URLs are response-only and are never saved.
export async function withStorageUrls(photos: ManagedPhoto[]): Promise<ManagedPhoto[]> {
  if (!storageConfigured) return photos;
  const names = photos.map(photo => /^\/api\/wedding\/media\/([a-f0-9-]{36}\.webp)$/.exec(photo.imageUrl)?.[1]);
  const paths = [...new Set(names.flatMap(name => name ? storagePaths(name) : []))];
  if (!paths.length) return photos;
  await ensureBucket();
  const { data, error } = await storage().from(uploadBucket).createSignedUrls(paths, 3600);
  if (error) throw new Error('Could not load photo links from Supabase Storage.');
  const urls = new Map((data || []).filter(item => item.signedUrl).map(item => [item.path, item.signedUrl]));
  return photos.map((photo, index) => {
    const name = names[index];
    if (!name) return photo;
    const [original, thumbnail, small] = storagePaths(name);
    const imageUrl = urls.get(original);
    // During migration, files not copied yet retain the legacy access-checked URL.
    return imageUrl ? { ...photo, imageUrl, thumbnailUrl: urls.get(thumbnail) || undefined, smallUrl: urls.get(small) || undefined } : photo;
  });
}
