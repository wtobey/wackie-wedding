import { withRsvpDatabase } from '@/lib/rsvp/database';
import {
  body,
  issuePartySession,
  json,
  rateLimit,
  route,
} from '@/lib/rsvp/http';
import { lookup } from '@/lib/rsvp/service';
import {
  id,
  object,
  text,
  normalizeName,
  RsvpError,
} from '@/lib/rsvp/validation';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  return route(async () => {
    const input = object(await body(request)),
      first = text(input.firstName, 'your first name'),
      last = text(input.lastName, 'your last name');
    if (!normalizeName(first) || !normalizeName(last))
      throw new RsvpError('Please enter your first and last name.');
    const selected = input.partyId ? id(input.partyId) : undefined;
    const result = await withRsvpDatabase(async (db) => {
      await rateLimit(db, request);
      return db.begin('isolation level repeatable read read only', (tx) =>
        lookup(tx, first, last, selected),
      );
    });
    if (result.status === 'found') await issuePartySession(result.party.id);
    return json(result);
  });
}
