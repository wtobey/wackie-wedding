import { withRsvpDatabase } from '@/lib/rsvp/database';
import { requireAdmin, route } from '@/lib/rsvp/http';
import { encodeCsv } from '@/lib/rsvp/csv';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  return route(async () => {
    await requireAdmin();
    const format = new URL(request.url).searchParams.get('format');
    const snapshot = await withRsvpDatabase((db) =>
      db.begin('isolation level repeatable read read only', async (tx) => ({
        exportedAt: new Date().toISOString(),
        schemaVersion: 1,
        settings: await tx`SELECT * FROM wedding_rsvp.settings`,
        parties: await tx`SELECT * FROM wedding_rsvp.parties`,
        guests: await tx`SELECT * FROM wedding_rsvp.guests`,
        events: await tx`SELECT * FROM wedding_rsvp.events`,
        invitations: await tx`SELECT * FROM wedding_rsvp.invitations`,
        audit: await tx`SELECT * FROM wedding_rsvp.audit_log ORDER BY id`,
        receipts: await tx`SELECT * FROM wedding_rsvp.receipts`,
      })),
    );
    let content: string;
    if (format === 'csv') {
      content = encodeCsv([
        [
          'party_id',
          'display_name',
          'greeting',
          'first_name',
          'last_name',
          'preferred_name',
          'is_unnamed_plus_one',
          'guest_id',
          'event_ids',
        ],
        ...snapshot.guests.map((g) => {
          const p = snapshot.parties.find((p) => p.id === g.party_id)!;
          return [
            g.party_id,
            p.display_name,
            p.greeting,
            g.first_name,
            g.last_name,
            g.preferred_name,
            String(g.is_unnamed_plus_one),
            g.id,
            snapshot.invitations
              .filter((i) => i.guest_id === g.id)
              .map((i) => i.event_id)
              .join(';'),
          ];
        }),
      ]);
    } else content = JSON.stringify(snapshot, null, 2);
    const ext = format === 'csv' ? 'csv' : 'json';
    return new Response(content, {
      headers: {
        'Content-Type': format === 'csv' ? 'text/csv' : 'application/json',
        'Cache-Control': 'no-store',
        'Content-Disposition': `attachment; filename="wedding-rsvp-${new Date().toISOString().slice(0, 10)}.${ext}"`,
      },
    });
  });
}
