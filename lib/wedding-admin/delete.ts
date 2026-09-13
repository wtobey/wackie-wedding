import { LibraryConflict } from './database';
import type { PhotoLibrary } from './types';

export function removeLibraryPhoto(current: PhotoLibrary, id: unknown, revision: unknown): PhotoLibrary {
  if (typeof id !== 'string' || !id || !Number.isSafeInteger(revision)) {
    throw new Error('Invalid photo deletion. Reload and try again.');
  }
  if (revision !== current.revision) throw new LibraryConflict();
  if (!current.photos.some(photo => photo.id === id)) throw new Error('Photo not found. Reload and try again.');
  return { revision: current.revision + 1, photos: current.photos.filter(photo => photo.id !== id) };
}
