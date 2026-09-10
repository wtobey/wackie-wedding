import test from 'node:test';
import assert from 'node:assert/strict';
import { analyticsAllowed, analyticsPath, cleanAnalyticsUrl } from './routes';

test('only public wedding screens are recorded, with a distinct password screen', () => {
  assert.equal(analyticsPath('/wedding_v1/gallery', false), '/wedding_v1/access');
  assert.equal(analyticsPath('/wedding_v1/gallery', true), '/wedding_v1/gallery');
  for (const path of ['/wedding_v1/admin', '/wedding_v1/admin/photos', '/api/wedding/admin/session', '/unknown']) {
    assert.equal(analyticsPath(path, true), null);
    assert.equal(analyticsPath(path, false), null);
  }
});

test('development, previews and unfamiliar hosts cannot send visitor events', () => {
  assert.equal(analyticsAllowed('production', 'wackie.wedding'), true);
  assert.equal(analyticsAllowed('preview', 'wackie.wedding'), false);
  assert.equal(analyticsAllowed(undefined, 'wackie.wedding'), false);
  assert.equal(analyticsAllowed('production', 'localhost'), false);
  assert.equal(analyticsAllowed('production', 'preview.vercel.app'), false);
});

test('URLs lose query parameters and fragments before collection', () => {
  assert.equal(cleanAnalyticsUrl('https://wackie.wedding/wedding_v1/gallery?token=private#secret'), 'https://wackie.wedding/wedding_v1/gallery');
  assert.equal(cleanAnalyticsUrl('invalid'), '');
});
