import assert from 'node:assert/strict';
import { test } from 'node:test';
import sharp from 'sharp';

test('Storage uploads all sizes, issues response-only links, and removes all variants', async () => {
  const originalFetch = globalThis.fetch;
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://storage-test.invalid';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-server-key';
  const files = new Map<string, Buffer>();
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init);
    const path = new URL(request.url).pathname.replace('/storage/v1/', '');
    assert.equal(request.headers.get('authorization'), 'Bearer test-server-key');
    if (path === 'bucket/wedding-uploads') return Response.json({ id: 'wedding-uploads', public: false });
    if (path === 'object/sign/wedding-uploads') {
      const { paths } = await request.json();
      return Response.json(paths.map((p: string) => files.has(p)
        ? { path: p, signedURL: `/object/sign/wedding-uploads/${p}?token=test` }
        : { path: p, error: 'not found', signedURL: null }));
    }
    if (path === 'object/wedding-uploads' && request.method === 'DELETE') {
      const { prefixes } = await request.json();
      prefixes.forEach((p: string) => files.delete(p));
      return Response.json([]);
    }
    const key = path.replace(/^object\/(authenticated\/)?wedding-uploads\//, '');
    if (request.method === 'POST') {
      files.set(key, Buffer.from(await request.arrayBuffer()));
      return Response.json({ Key: `wedding-uploads/${key}` });
    }
    if (files.has(key)) return new Response(new Uint8Array(files.get(key)!));
    throw new Error(`Unexpected storage request: ${request.method} ${path}`);
  };
  try {
    const storage = await import('./storage');
    const name = '11111111-1111-1111-1111-111111111111.webp';
    const original = await sharp({ create: { width: 1200, height: 1600, channels: 3, background: 'red' } }).webp().toBuffer();
    await storage.saveStorageMedia(name, original);
    assert.equal(files.size, 3);
    assert.deepEqual(await storage.readStorageMedia(name), original);
    assert.equal((await sharp(files.get(`thumbnails/${name}`)).metadata()).height, 880);
    assert.equal((await sharp(files.get(`small/${name}`)).metadata()).height, 440);
    const photo = { id: name, collection: 'gallery' as const, imageUrl: `/api/wedding/media/${name}`, caption: 'Caption', alt: '', photoDate: '2026-01-01', included: true };
    const [resolved] = await storage.withStorageUrls([photo]);
    assert.match(resolved.imageUrl, /object\/sign\/wedding-uploads\/originals/);
    assert.match(resolved.smallUrl!, /\/small\//);
    assert.equal(photo.imageUrl, `/api/wedding/media/${name}`);
    assert.equal(resolved.caption, photo.caption);
    await storage.deleteStorageMedia(name);
    assert.equal(files.size, 0);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL; else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = previousKey;
  }
});
