import { readLibrary } from '@/lib/wedding-admin/store';
import { withStorageUrls } from '@/lib/wedding-admin/storage';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const collection = new URL(request.url).searchParams.get('collection') || 'gallery';
  if (!['gallery', 'venue'].includes(collection)) return new Response(null, { status: 400 });
  try {
    const library = await readLibrary();
    return Response.json(await withStorageUrls(library.photos.filter(photo => photo.collection === collection && photo.included)), { headers: { 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ error: 'Photo library unavailable.' }, { status: 503 }); }
}
