import { withRsvpDatabase } from '@/lib/rsvp/database';
import { body, json, requireParty, route, rateLimit } from '@/lib/rsvp/http';
import { settings, submit } from '@/lib/rsvp/service';
import { parseSubmission } from '@/lib/rsvp/validation';
export const runtime = 'nodejs';
export async function GET() {
  return route(async () => json(await withRsvpDatabase(settings)));
}
export async function POST(request: Request) {
  return route(async () => {
    const input = parseSubmission(await body(request));
    await requireParty(input.partyId);
    return json({
      party: await withRsvpDatabase(async (db) => {
        await rateLimit(db, request, 'save');
        return submit(db, input);
      }),
    });
  });
}
