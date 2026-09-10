import type { ManagedPhoto } from './types';

// Sort gallery slots only, preserving venue order and ties (including undated photos).
export function sortGalleryByDate(photos: ManagedPhoto[]): ManagedPhoto[] {
  const gallery = photos.filter(photo => photo.collection === 'gallery').sort((a, b) => {
    if (!a.photoDate) return b.photoDate ? 1 : 0;
    if (!b.photoDate) return -1;
    return a.photoDate.localeCompare(b.photoDate);
  });
  let index = 0;
  return photos.map(photo => photo.collection === 'gallery' ? gallery[index++] : photo);
}
