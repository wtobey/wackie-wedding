import test from 'node:test';
import assert from 'node:assert/strict';
import { removeLibraryPhoto } from './delete';
import { LibraryConflict } from './database';
import type { PhotoLibrary } from './types';

const library: PhotoLibrary = {
  revision: 7,
  photos: [
    { id: 'gallery-1', collection: 'gallery', imageUrl: '/shared.webp', caption: 'First', alt: 'First photo', photoDate: '2024-01-01', included: true },
    { id: 'venue-1', collection: 'venue', imageUrl: '/shared.webp', caption: 'Venue', alt: '', photoDate: null, included: true },
    { id: 'gallery-2', collection: 'gallery', imageUrl: '/other.webp', caption: 'Second', alt: '', photoDate: null, included: false, crop: { x: 20, y: 40, zoom: 2 } },
  ],
};

test('deleting one photo preserves other collections, order, edits and shared image references', () => {
  const before = structuredClone(library);
  const result = removeLibraryPhoto(library, 'gallery-1', 7);
  assert.deepEqual(result, { revision: 8, photos: before.photos.slice(1) });
  assert.deepEqual(library, before);
});

test('a stale delete cannot remove a photo after another editor changes the library', () => {
  assert.throws(() => removeLibraryPhoto(library, 'gallery-1', 6), LibraryConflict);
  assert.equal(library.photos.length, 3);
});

test('invalid or missing photo identifiers do not change the library', () => {
  for (const id of ['', null, {}, 'unknown']) {
    assert.throws(() => removeLibraryPhoto(library, id, 7));
  }
  for (const revision of [undefined, '7', 7.5]) {
    assert.throws(() => removeLibraryPhoto(library, 'gallery-1', revision));
  }
  assert.equal(library.revision, 7);
});

test('deleting the last photo leaves an empty library with a new revision', () => {
  const result = removeLibraryPhoto({ revision: 7, photos: [library.photos[1]] }, 'venue-1', 7);
  assert.deepEqual(result, { revision: 8, photos: [] });
});
