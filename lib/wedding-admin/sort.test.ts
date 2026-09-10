import test from 'node:test';
import assert from 'node:assert/strict';
import { sortGalleryByDate } from './sort';
import type { ManagedPhoto } from './types';

test('sorts dates chronologically without disturbing venue slots, ties or photo edits', () => {
  const photo = (id: string, photoDate: string | null, collection: 'gallery' | 'venue' = 'gallery'): ManagedPhoto =>
    ({ id, photoDate, collection, caption: id, alt: '', imageUrl: '/photo.jpg', included: false });
  const input = [photo('undated', null), photo('venue', null, 'venue'), photo('new', '2026-01-01'), photo('old', '2020-01-01'), photo('tie', '2020-01-01'), photo('undated2', null)];
  const result = sortGalleryByDate(input);
  assert.deepEqual(result.map(p => p.id), ['old', 'venue', 'tie', 'new', 'undated', 'undated2']);
  assert.equal(result[1], input[1]);
  assert.equal(result[0], input[3]);
  assert.equal(input[0].id, 'undated');
  assert.deepEqual(sortGalleryByDate(result), result);
});
