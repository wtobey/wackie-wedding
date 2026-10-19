import { writeFile, rename, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { engagementPhotos, desktopAdditionalPhotos } from '@/data/engagement-photos';
import { sameOrigin } from '@/lib/http/same-origin';

export async function PUT(request: Request) {
  if (process.env.NODE_ENV !== 'development') return new Response(null, { status: 404 });
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  const allowed = new Set([...engagementPhotos, ...desktopAdditionalPhotos].map(photo => photo.src));
  let body: unknown;
  try { body = await request.json(); }
  catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const target = !Array.isArray(body) && body && typeof body === 'object' && 'target' in body ? body.target : 'desktop';
  if (target !== 'mobile' && target !== 'desktop') return Response.json({ error: 'Invalid layout target' }, { status: 400 });
  const layout = Array.isArray(body) ? body : body && typeof body === 'object' && 'layout' in body ? body.layout : null;
  const count = target === 'mobile' ? 8 : 11;
  if (!Array.isArray(layout) || layout.length !== count || new Set(layout).size !== count ||
    !layout.every(value => typeof value === 'string' && allowed.has(value))) {
    return Response.json({ error: `Layout must contain ${count} distinct photos from the collection.` }, { status: 400 });
  }
  const destination = join(process.cwd(), `data/engagement-${target}-layout.json`);
  const temporary = `${destination}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, `${JSON.stringify(layout, null, 2)}\n`);
    await rename(temporary, destination);
    return Response.json({ saved: true });
  } catch {
    return Response.json({ error: 'Could not save layout' }, { status: 500 });
  } finally { await rm(temporary, { force: true }); }
}
