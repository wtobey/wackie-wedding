import test from 'node:test';
import assert from 'node:assert/strict';
import { sameOrigin } from './same-origin';
test('origin follows the browser-facing host and rejects cross-origin posts', () => {
  const req = (origin: string, host = '127.0.0.1:3000') =>
    new Request('http://localhost:3000/api/rsvp', {
      headers: { origin, host },
    });
  assert.equal(sameOrigin(req('http://127.0.0.1:3000')), true);
  for (const origin of [
    'http://evil.example',
    'null',
    'http://127.0.0.1:3000/',
    'http://127.0.0.1:3001',
    'https://127.0.0.1:3000',
  ])
    assert.equal(sameOrigin(req(origin)), false);
  assert.equal(
    sameOrigin(
      new Request('https://wackie.wedding/api/rsvp', {
        headers: { origin: 'https://wackie.wedding' },
      }),
    ),
    true,
  );
});
