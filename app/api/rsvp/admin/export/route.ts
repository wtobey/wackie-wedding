import { withRsvpDatabase } from '@/lib/rsvp/database';
import { requireAdmin, route } from '@/lib/rsvp/http';
import { captureRsvp, readSnapshot } from '@/lib/rsvp/snapshots';
import { id } from '@/lib/rsvp/validation';
import { encodeCsv } from '@/lib/rsvp/csv';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  return route(async () => {
    await requireAdmin();
    const format = new URL(request.url).searchParams.get('format');
    const snapshotId = new URL(request.url).searchParams.get('snapshot');
    const snapshot = await withRsvpDatabase((db) =>
      db.begin('isolation level repeatable read read only', async (tx) =>
        snapshotId
          ? ((await readSnapshot(tx, id(snapshotId, 'the snapshot')))
              .payload as Awaited<ReturnType<typeof captureRsvp>>)
          : captureRsvp(tx),
      ),
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
        ...snapshot.guests
          .filter((g) => !g.archived_at)
          .map((g) => {
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
                .filter((i) => i.guest_id === g.id && !i.archived_at)
                .map((i) => i.event_id)
                .join(';'),
            ].map((value) => (value === null ? null : String(value)));
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
