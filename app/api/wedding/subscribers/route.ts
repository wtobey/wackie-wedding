import { withRsvpDatabase } from '@/lib/rsvp/database';
import { body, json, rateLimit } from '@/lib/rsvp/http';
import { RsvpError } from '@/lib/rsvp/validation';
import { signupInput, subscribeEmail } from '@/lib/subscribers/service';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    const input = signupInput(await body(request, 2048));
    await withRsvpDatabase(async db => {
      await rateLimit(db, request, 'email-signup');
      await subscribeEmail(db, input);
    });
    // Do not disclose whether an address was already registered.
    return json({ ok: true });
  } catch (error) {
    if (error instanceof RsvpError && error.status !== 503)
      return json({ error: error.message }, error.status);
    console.error('Email signup failed', { code: (error as { code?: string })?.code || 'unavailable' });
    return json({ error: 'We couldn’t save your email. Please try again, or sign up later on the accommodations page.' }, 503);
  }
}
