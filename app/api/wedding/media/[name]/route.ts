import { isAdmin } from '@/lib/wedding-admin/auth';
import { readLibrary, readMedia } from '@/lib/wedding-admin/store';
import { photoThumbnail } from '@/lib/wedding-admin/thumbnail';
export const runtime = 'nodejs';
export async function GET(request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!/^[a-f0-9-]{36}\.webp$/.test(name)) return new Response(null, { status: 404 });
  try {
    const library = await readLibrary();
    if (!library.photos.some(photo => photo.imageUrl === `/api/wedding/media/${name}` && photo.included) && !await isAdmin()) return new Response(null, { status: 404 });
    const size = new URL(request.url).searchParams.get('size');
    const bytes = size === 'thumb' || size === 'small'
      ? await photoThumbnail(name, () => readMedia(name), size)
      : await readMedia(name);
    return new Response(new Uint8Array(bytes), { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
  } catch { return new Response(null, { status: 404 }); }
}
