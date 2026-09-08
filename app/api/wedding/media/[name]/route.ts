import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { isAdmin } from '@/lib/wedding-admin/auth';
import { readLibrary, uploadDirectory } from '@/lib/wedding-admin/store';
export const runtime = 'nodejs';
export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!/^[a-f0-9-]{36}\.webp$/.test(name)) return new Response(null, { status: 404 });
  try {
    const library = await readLibrary();
    if (!library.photos.some(photo => photo.imageUrl === `/api/wedding/media/${name}` && photo.included) && !await isAdmin()) return new Response(null, { status: 404 });
    return new Response(await readFile(path.join(uploadDirectory, name)), { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
  } catch { return new Response(null, { status: 404 }); }
}
