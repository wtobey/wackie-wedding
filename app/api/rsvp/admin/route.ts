import { csvSource } from '@/lib/rsvp/csv';
import { withRsvpDatabase } from '@/lib/rsvp/database';
import { body, json, requireAdmin, route } from '@/lib/rsvp/http';
import {
  adminData,
  commitImport,
  previewImport,
  setMode,
} from '@/lib/rsvp/service';
import { id, object, revision, RsvpError, text } from '@/lib/rsvp/validation';
import {
  commitRollback,
  manualSnapshot,
  previewRollback,
} from '@/lib/rsvp/snapshots';
export const runtime = 'nodejs';
export async function GET() {
  return route(async () => {
    await requireAdmin();
    return json(
      await withRsvpDatabase((db) =>
        db.begin('isolation level repeatable read read only', adminData),
      ),
    );
  });
}
export async function POST(request: Request) {
  return route(async () => {
    await requireAdmin();
    const input = object(await body(request, 1_100_000));
    if (input.action === 'snapshot')
      return json(
        await withRsvpDatabase((db) =>
          manualSnapshot(db, id(input.requestId, 'the snapshot request')),
        ),
      );
    if (input.action === 'preview_rollback')
      return json(
        await withRsvpDatabase((db) =>
          previewRollback(db, id(input.snapshotId, 'the snapshot')),
        ),
      );
    if (input.action === 'rollback')
      return json(
        await withRsvpDatabase((db) =>
          commitRollback(
            db,
            id(input.snapshotId, 'the snapshot'),
            revision(input.revision),
            text(input.hash, 'the preview hash'),
          ),
        ),
      );
    if (input.action === 'mode') {
      if (input.mode !== 'closed' && input.mode !== 'declines_only')
        throw new RsvpError(
          'RSVP can be closed or accept early declines. Yes responses are not available yet.',
        );
      const mode = input.mode;
      return json(
        await withRsvpDatabase((db) =>
          setMode(db, mode, revision(input.revision)),
        ),
      );
    }
    const csv = csvSource(input.csv);
    if (!Array.isArray(input.eventIds) || input.eventIds.length > 50)
      throw new RsvpError('Choose event invitations.');
    const events = input.eventIds.map((e) => id(e, 'the event'));
    if (input.action === 'preview')
      return json(
        await withRsvpDatabase((db) => previewImport(db, csv, events)),
      );
    if (input.action === 'import')
      return json(
        await withRsvpDatabase((db) =>
          commitImport(
            db,
            csv,
            events,
            revision(input.revision),
            text(input.hash, 'the preview hash'),
            id(input.requestId, 'the import request'),
          ),
        ),
      );
    throw new RsvpError('Unknown action.');
  });
}
