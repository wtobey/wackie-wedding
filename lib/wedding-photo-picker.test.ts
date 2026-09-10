import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPhotoPicker } from './wedding-photo-picker';

test('each round covers the entire library without repeating or mutating it', () => {
  const photos = Array.from({ length: 32 }, (_, i) => ({ id: String(i) }));
  const original = [...photos];
  const pick = createPhotoPicker(photos);
  let previous: string | undefined;
  for (let round = 0; round < 20; round++) {
    const ids = Array.from({ length: photos.length }, () => pick()!.id);
    assert.equal(new Set(ids).size, photos.length);
    assert.notEqual(ids[0], previous);
    previous = ids.at(-1);
  }
  assert.deepEqual(photos, original);
});

test('prevents a repeated photo at a shuffle boundary', () => {
  const pick = createPhotoPicker([{ id: 'a' }, { id: 'b' }], () => 0);
  assert.deepEqual(Array.from({ length: 6 }, () => pick()!.id), ['a', 'b', 'a', 'b', 'a', 'b']);
});

test('handles an empty or single-photo library', () => {
  assert.equal(createPhotoPicker([])(), null);
  const photo = { id: 'only' };
  const pick = createPhotoPicker([photo]);
  assert.equal(pick(), photo);
  assert.equal(pick(), photo);
});
