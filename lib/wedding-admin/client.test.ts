import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adminRequest } from './client';

function untilAborted(signal: AbortSignal): Promise<never> {
  return new Promise((_, reject) => {
    if (signal.aborted) reject(new DOMException('Aborted', 'AbortError'));
    else signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
  });
}
test('stalled connection times out with a retryable message', async context => {
  context.mock.method(globalThis, 'fetch', (_url: string, options: RequestInit) => untilAborted(options.signal!));
  await assert.rejects(adminRequest('/session', {}, 10), /took too long/);
});
test('timeout also covers a response body that never finishes', async context => {
  context.mock.method(globalThis, 'fetch', async (_url: string, options: RequestInit) => ({ ok: true, json: () => untilAborted(options.signal!) }));
  await assert.rejects(adminRequest('/photos', {}, 10), /took too long/);
});
test('unmount cancellation is not reported as a timeout', async context => {
  context.mock.method(globalThis, 'fetch', (_url: string, options: RequestInit) => untilAborted(options.signal!));
  const controller = new AbortController();
  const result = adminRequest('/session', { signal: controller.signal }, 1000);
  controller.abort();
  await assert.rejects(result, { name: 'AbortError' });
});
test('successful responses and explicit server errors remain intact', async context => {
  const mock = context.mock.method(globalThis, 'fetch', async () => Response.json({ admin: true }));
  assert.deepEqual(await adminRequest('/session'), { admin: true });
  mock.mock.mockImplementation(async () => Response.json({ error: 'Please sign in.' }, { status: 401 }));
  await assert.rejects(adminRequest('/photos'), /Please sign in/);
});
test('invalid server response offers recovery instead of treating it as success', async context => {
  context.mock.method(globalThis, 'fetch', async () => new Response('<html>Error</html>'));
  await assert.rejects(adminRequest('/session'), /unexpected response/);
});
