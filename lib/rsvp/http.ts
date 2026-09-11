import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { isAdmin, sameOrigin } from '@/lib/wedding-admin/auth';
import type { Db } from './database';
import { RsvpError } from './validation';
const cookieName = 'wedding-rsvp-party';
function secret() {
  const s =
    process.env.RSVP_SESSION_SECRET || process.env.WEDDING_ADMIN_PASSWORD;
  if (!s || s.length < 16)
    throw new RsvpError('RSVP is not available yet.', 503);
  return s;
}
const digest = (value: string) =>
  createHmac('sha256', secret()).update(value).digest('hex');
export async function issuePartySession(partyId: string) {
  const payload = Buffer.from(
    JSON.stringify({ partyId, expires: Date.now() + 60 * 60 * 1000 }),
  ).toString('base64url');
  (await cookies()).set(cookieName, `${payload}.${digest(payload)}`, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/api/rsvp',
    maxAge: 3600,
  });
}
export async function requireParty(partyId: string) {
  const token = (await cookies()).get(cookieName)?.value || '',
    [payload, signature] = token.split('.');
  const expected = digest(payload || '');
  if (
    !signature ||
    !/^[a-f0-9]{64}$/.test(signature) ||
    signature.length !== expected.length ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  )
    throw new RsvpError('Look up your name again before saving.', 401);
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (data.partyId !== partyId || data.expires < Date.now())
      throw new Error();
  } catch {
    throw new RsvpError('Look up your name again before saving.', 401);
  }
}
export async function requireAdmin() {
  if (!(await isAdmin()))
    throw new RsvpError('Please sign in as an admin.', 401);
}
export async function body(request: Request, max = 64_000) {
  if (!sameOrigin(request))
    throw new RsvpError('Please submit from the wedding website.', 403);
  if (!request.headers.get('content-type')?.startsWith('application/json'))
    throw new RsvpError('Expected a JSON request.', 415);
  if (Number(request.headers.get('content-length')) > max)
    throw new RsvpError('Request is too large.', 413);
  const reader = request.body?.getReader();
  if (!reader) throw new RsvpError('Missing request.');
  let bytes = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.length;
    if (bytes > max) {
      await reader.cancel();
      throw new RsvpError('Request is too large.', 413);
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString());
  } catch {
    throw new RsvpError('Invalid JSON request.');
  }
}
export async function rateLimit(db: Db, request: Request, action = 'lookup') {
  // Vercel overwrites x-vercel-forwarded-for. Do not trust arbitrary forwarded IPs elsewhere.
  const ip = process.env.VERCEL
    ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ||
      'unknown'
    : 'local';
  for (const [key, limit] of [
    [digest(`${action}:${ip}`), 30],
    [`${action}:global`, 300],
  ] as const) {
    const [r] =
      await db`INSERT INTO wedding_rsvp.rate_limits(key,window_start) VALUES(${key},date_trunc('hour',now())) ON CONFLICT(key,window_start) DO UPDATE SET attempts=rate_limits.attempts+1 RETURNING attempts`;
    if (r.attempts > limit)
      throw new RsvpError(
        'Too many attempts. Please try again in an hour or contact Will or Jackie.',
        429,
      );
  }
}
export function json(value: unknown, status = 200) {
  return Response.json(value, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}
export async function route(operation: () => Promise<Response>) {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof RsvpError)
      return json(
        { error: error.message, details: error.details },
        error.status,
      );
    console.error('RSVP request failed', {
      code: (error as { code?: string })?.code || 'unexpected',
    });
    return json(
      {
        error:
          'We could not complete the request. Your previous responses are safe. Please try again.',
      },
      503,
    );
  }
}
