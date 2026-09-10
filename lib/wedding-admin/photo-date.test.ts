import assert from 'node:assert/strict';
import { test } from 'node:test';
import sharp from 'sharp';
import { exifCalendarDate, readPhotoDate } from './photo-date';

test('keeps the camera calendar date and rejects invalid dates', () => {
  assert.equal(exifCalendarDate('2024:02:29 23:59:59'), '2024-02-29');
  assert.equal(exifCalendarDate('2023:02:29 12:00:00'), null);
  assert.equal(exifCalendarDate('0000:00:00 00:00:00'), null);
  assert.equal(exifCalendarDate(undefined), null);
});

test('reads original capture date ahead of digitization date from a real JPEG', async () => {
  const bytes = await sharp({ create: { width: 8, height: 8, channels: 3, background: 'red' } })
    .withExif({ IFD2: { DateTimeOriginal: '2021:06:05 23:59:59', DateTimeDigitized: '2026:09:09 01:00:00' } })
    .jpeg().toBuffer();
  assert.equal(await readPhotoDate(bytes), '2021-06-05');
});

test('missing or damaged metadata does not block an upload', async () => {
  const bytes = await sharp({ create: { width: 8, height: 8, channels: 3, background: 'red' } }).jpeg().toBuffer();
  assert.equal(await readPhotoDate(bytes), null);
  assert.equal(await readPhotoDate(new Uint8Array([1, 2, 3])), null);
});
