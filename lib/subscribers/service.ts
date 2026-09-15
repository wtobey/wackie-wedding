import type { Db } from '@/lib/rsvp/database';
import { object, RsvpError } from '@/lib/rsvp/validation';

export function signupInput(value: unknown) {
  const input = object(value);
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const [local, domain] = email.split('@');
  if (
    email.length > 254 || !local || local.length > 64 ||
    !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local) ||
    local.startsWith('.') || local.endsWith('.') || local.includes('..') ||
    email.split('@').length !== 2 || !domain?.includes('.') ||
    !domain.split('.').every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))
  ) throw new RsvpError('Please enter a valid email address.');
  if (input.source !== 'password' && input.source !== 'accommodations')
    throw new RsvpError('Please use a signup form on the wedding website.');
  return { email, source: input.source };
}

export async function subscribeEmail(db: Db, input: ReturnType<typeof signupInput>) {
  // A retry or signup from the other form must preserve the original consent.
  await db`INSERT INTO wedding_rsvp.email_subscribers(email, source)
    VALUES(${input.email}, ${input.source}) ON CONFLICT(email) DO NOTHING`;
}
