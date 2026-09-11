import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
const cookieName = 'wedding-admin';
const lifetime = 8 * 60 * 60;
export function configured() { return Boolean(process.env.WEDDING_ADMIN_PASSWORD?.length && process.env.WEDDING_ADMIN_PASSWORD.length >= 16); }
function digest(value: string) { return createHmac('sha256', process.env.WEDDING_ADMIN_PASSWORD || '').update(value).digest('hex'); }
function equal(a: string, b: string) { return a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b)); }
export function validPassword(value: string) { return configured() && equal(digest(value), digest(process.env.WEDDING_ADMIN_PASSWORD!)); }
export async function isAdmin() {
  if (!configured()) return false;
  const token = (await cookies()).get(cookieName)?.value || '';
  const [expires, signature] = token.split('.');
  return Boolean(expires && signature && Number(expires) > Date.now() && equal(signature, digest(`admin:${expires}`)));
}
export async function setSession(active: boolean) {
  const expires = String(Date.now() + lifetime * 1000);
  (await cookies()).set(cookieName, active ? `${expires}.${digest(`admin:${expires}`)}` : '', {
    httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production',
    path: '/', maxAge: active ? lifetime : 0,
  });
}
export { sameOrigin } from '@/lib/http/same-origin';
