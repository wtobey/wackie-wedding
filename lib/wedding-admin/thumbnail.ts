import sharp from 'sharp';

// Upload names are immutable UUIDs. Keep a bounded cache of small derivatives;
// the media route still checks access before consulting this cache.
const thumbnails = new Map<string, Promise<Buffer>>();
export function photoThumbnail(name: string, read: () => Promise<Buffer>, size: 'thumb' | 'small' = 'thumb'): Promise<Buffer> {
  const key = `${name}:${size}`;
  const edge = size === 'small' ? 440 : 880;
  const cached = thumbnails.get(key);
  if (cached) return cached;
  const result = read().then(bytes => sharp(bytes).rotate()
    .resize({ width: edge, height: edge, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 78 }).toBuffer());
  thumbnails.set(key, result);
  if (thumbnails.size > 32) thumbnails.delete(thumbnails.keys().next().value!);
  void result.catch(() => { if (thumbnails.get(key) === result) thumbnails.delete(key); });
  return result;
}
