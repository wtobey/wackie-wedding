import sharp from 'sharp';

// Upload names are immutable UUIDs. Keep a bounded cache of small derivatives;
// the media route still checks access before consulting this cache.
const thumbnails = new Map<string, Promise<Buffer>>();
export function photoThumbnail(name: string, read: () => Promise<Buffer>): Promise<Buffer> {
  const cached = thumbnails.get(name);
  if (cached) return cached;
  const result = read().then(bytes => sharp(bytes).rotate()
    .resize({ width: 880, height: 880, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 78 }).toBuffer());
  thumbnails.set(name, result);
  if (thumbnails.size > 32) thumbnails.delete(thumbnails.keys().next().value!);
  void result.catch(() => { if (thumbnails.get(name) === result) thumbnails.delete(name); });
  return result;
}
