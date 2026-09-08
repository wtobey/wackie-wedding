import { configured, isAdmin, sameOrigin, setSession, validPassword } from '@/lib/wedding-admin/auth';
export const runtime = 'nodejs';
// A process-wide cooldown also bounds attempts when a client rotates IP headers.
let failures = 0;
let nextAttempt = 0;
export async function GET() { return Response.json({ admin: await isAdmin(), configured: configured() }, { headers: { 'Cache-Control': 'no-store' } }); }
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
  if (!configured()) return Response.json({ error: 'Admin access has not been configured.' }, { status: 503 });
  if (Date.now() < nextAttempt) return Response.json({ error: 'Please wait a moment before trying again.' }, { status: 429 });
  if (Number(request.headers.get('content-length')) > 4096) return new Response(null, { status: 413 });
  let password: unknown;
  try { ({ password } = await request.json()); } catch { return new Response(null, { status: 400 }); }
  if (typeof password !== 'string' || password.length > 1024 || !validPassword(password)) {
    failures++; nextAttempt = Date.now() + Math.min(60000, 500 * 2 ** Math.min(failures, 7));
    return Response.json({ error: 'That password does not match.' }, { status: 401 });
  }
  failures = 0; nextAttempt = 0; await setSession(true);
  return Response.json({ admin: true });
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  await setSession(false); return Response.json({ admin: false });
}
