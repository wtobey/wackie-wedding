import assert from "node:assert/strict";
import { test } from "node:test";
import { advanceTimelinePosition, timelineScrollAnchor, timelineVisualPosition, GALLERY_PAGE_SIZE, groupTimelinePhotos, loadGalleryRows, nearestPhotoIndex, photoDateLabel, photoTimestamp, type GalleryRow, type TimelinePhoto } from "./wedding-timeline";

function photo(id: number, photoDate: string | null): TimelinePhoto { return { id, photoDate, caption: null, imageUrl: `/photo-${id}.jpg` }; }

test("native swipes retain the visual offset without snapping or losing momentum distance", () => {
  const initial = 103.25;
  const anchor = timelineScrollAnchor(initial);
  const correction = anchor - initial;
  for (const delta of [0, 0.5, 15.25, 150, -20]) {
    assert.equal(timelineVisualPosition(anchor + delta, correction, 1000), initial + delta);
  }
  const released = timelineVisualPosition(anchor + 150, correction, 1000);
  assert.equal(advanceTimelinePosition(released, 16, 1000), released + 0.448);
  assert.equal(timelineVisualPosition(-40, correction, 1000), 0);
  assert.equal(timelineVisualPosition(1040, correction, 1000), 1000);
});

test("auto-scroll stays subpixel-smooth at 60 and 120 Hz with batched native scroll writes", () => {
  for (const hz of [60, 120]) {
    let position = 0;
    let previousAnchor = 0;
    let nativeWrites = 0;
    for (let frame = 0; frame < hz; frame++) {
      const next = advanceTimelinePosition(position, 1000 / hz, 5000);
      const anchor = timelineScrollAnchor(next);
      const correction = anchor - next;
      const visualPosition = anchor - correction;
      assert.ok(Math.abs(visualPosition - position - 28 / hz) < 1e-9);
      assert.ok(correction <= 0 && correction > -8);
      if (anchor !== previousAnchor) nativeWrites++;
      previousAnchor = anchor;
      position = next;
    }
    assert.ok(Math.abs(position - 28) < 1e-9);
    assert.equal(nativeWrites, 3);
  }
});

test("auto-scroll bounds long-frame jumps and handles the end and empty tracks", () => {
  assert.equal(advanceTimelinePosition(10, 5000, 100), 10.896);
  assert.equal(advanceTimelinePosition(99.8, 16, 100), 100);
  assert.equal(advanceTimelinePosition(100, 16, 100), 0);
  assert.equal(advanceTimelinePosition(10, 16, 0), 0);
  assert.equal(advanceTimelinePosition(10, -1, 100), 10);
});

test("first and latest are based on photo dates, with stable ordering and undated photos separate", () => {
  const original = [photo(1, "2025-09-01"), photo(20, "2019-01-01"), photo(2, null), photo(3, "invalid"), photo(8, "2019-01-01"), photo(1, "2025-09-01")];
  const groups = groupTimelinePhotos(original);
  assert.deepEqual(groups.dated.map(item => item.id), [8, 20, 1]);
  assert.deepEqual(groups.undated.map(item => item.id), [2, 3]);
  assert.equal(original.length, 6);
});

test("empty and wholly undated albums have no invented chronology", () => {
  assert.deepEqual(groupTimelinePhotos([]), { dated: [], undated: [] });
  const groups = groupTimelinePhotos([photo(4, null), photo(2, "2025-02-30")]);
  assert.equal(groups.dated.length, 0);
  assert.deepEqual(groups.undated.map(item => item.id), [2, 4]);
});

test("calendar dates stay in the correct month and invalid dates remain undated", () => {
  assert.equal(photoDateLabel("2020-01-01"), "Jan 2020");
  assert.equal(photoDateLabel(null), "Date to come");
  assert.equal(photoTimestamp("2025-02-29"), null);
  assert.notEqual(photoTimestamp("2024-02-29"), null);
  assert.equal(photoTimestamp("2020-01-01T00:00:00Z"), null);
});

test("loads beyond the first page so the seeker's latest endpoint is the actual latest", async () => {
  const source: GalleryRow[] = Array.from({ length: GALLERY_PAGE_SIZE * 2 + 3 }, (_, id) => ({ id, image_path: `${id}.jpg`, caption: null, photo_date: "2020-01-01" }));
  const ranges: number[][] = [];
  const result = await loadGalleryRows(async (from, to) => { ranges.push([from, to]); return source.slice(from, to + 1); });
  assert.deepEqual(result, source);
  assert.deepEqual(ranges, [[0, 199], [200, 399], [400, 599]]);
});

test("later-page failure does not return an incomplete timeline", async () => {
  await assert.rejects(loadGalleryRows(async from => {
    if (from > 0) throw new Error("Network unavailable");
    return Array.from({ length: GALLERY_PAGE_SIZE }, (_, id) => ({ id, image_path: `${id}.jpg`, caption: null, photo_date: null }));
  }), /Network unavailable/);
});

test("cancelled loading stops before requesting another page", async () => {
  const controller = new AbortController();
  controller.abort();
  let calls = 0;
  await assert.rejects(loadGalleryRows(async () => { calls++; return []; }, controller.signal), { name: "AbortError" });
  assert.equal(calls, 0);
});

test("seeker handles endpoints, fractional scrolling, and one-photo albums", () => {
  assert.equal(nearestPhotoIndex(0, 336, 9), 0);
  assert.equal(nearestPhotoIndex(168.5, 336, 9), 1);
  assert.equal(nearestPhotoIndex(100000, 336, 9), 8);
  assert.equal(nearestPhotoIndex(-100, 336, 9), 0);
  assert.equal(nearestPhotoIndex(100, 0, 1), 0);
});

test('saved admin order overrides chronology while undated photos stay separate', () => {
  const photos = [
    { id: 1, imageUrl: '', caption: null, photoDate: '2020-01-01', sortOrder: 2 },
    { id: 2, imageUrl: '', caption: null, photoDate: '2025-01-01', sortOrder: 0 },
    { id: 3, imageUrl: '', caption: null, photoDate: null, sortOrder: 1 },
  ];
  const result = groupTimelinePhotos(photos);
  assert.deepEqual(result.dated.map(photo => photo.id), [2, 1]);
  assert.deepEqual(result.undated.map(photo => photo.id), [3]);
});
