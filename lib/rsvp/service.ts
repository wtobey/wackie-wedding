import { randomUUID } from 'node:crypto';
import type postgres from 'postgres';
import type { Db } from './database';
import type {
  Party,
  RsvpMode,
  Submission,
  DeclineSubmission,
  LookupResult,
  ImportPlan,
  ImportRow,
} from './types';
import { normalizeName, RsvpError } from './validation';
import { hash, importRows } from './csv';
export async function settings(db: Db) {
  const [s] =
    await db`SELECT mode,revision FROM wedding_rsvp.settings WHERE id=1`;
  return { mode: s.mode as RsvpMode, revision: s.revision as number };
}
export async function party(db: Db, partyId: string): Promise<Party> {
  const [p] =
    await db`SELECT id,display_name,greeting,revision FROM wedding_rsvp.parties WHERE id=${partyId}`;
  if (!p) throw new RsvpError('Party not found.', 404);
  const guests =
    await db`SELECT * FROM wedding_rsvp.guests WHERE party_id=${partyId} ORDER BY is_unnamed_plus_one,created_at,id`;
  const invitations =
    await db`SELECT i.*,e.name,e.starts_at FROM wedding_rsvp.invitations i JOIN wedding_rsvp.events e ON e.id=i.event_id JOIN wedding_rsvp.guests g ON g.id=i.guest_id WHERE g.party_id=${partyId} ORDER BY e.starts_at NULLS LAST,e.name`;
  return {
    id: p.id,
    displayName: p.display_name,
    greeting: p.greeting,
    revision: p.revision,
    guests: guests.map((g) => ({
      id: g.id,
      firstName: g.first_name,
      lastName: g.last_name,
      preferredName: g.preferred_name,
      isUnnamedPlusOne: g.is_unnamed_plus_one,
      events: invitations
        .filter((i) => i.guest_id === g.id)
        .map((i) => ({
          eventId: i.event_id,
          name: i.name,
          startsAt: i.starts_at?.toISOString() ?? null,
          attendance: i.attendance,
          mealChoice: i.meal_choice,
          dietaryRestrictions: i.dietary_restrictions,
          respondedAt: i.responded_at?.toISOString() ?? null,
        })),
    })),
  };
}
export async function lookup(
  db: Db,
  first: string,
  last: string,
  selected?: string,
): Promise<LookupResult> {
  const { mode } = await settings(db);
  if (mode === 'closed')
    throw new RsvpError('RSVP will open when invitations arrive.', 403);
  const matches =
    await db`SELECT DISTINCT p.id,p.display_name FROM wedding_rsvp.guests g JOIN wedding_rsvp.parties p ON p.id=g.party_id WHERE normalized_first_name=${normalizeName(first)} AND normalized_last_name=${normalizeName(last)} ORDER BY p.id LIMIT 21`;
  if (!matches.length || (selected && !matches.some((p) => p.id === selected)))
    return { status: 'not_found' };
  if (matches.length > 20)
    throw new RsvpError(
      'Please reach out to Will or Jackie for help finding your invitation.',
    );
  if (matches.length > 1 && !selected)
    return {
      status: 'ambiguous',
      parties: matches.map((p) => ({
        id: p.id,
        displayName:
          p.display_name ||
          'Please contact Will or Jackie to identify this party',
      })),
    };
  return {
    status: 'found',
    party: await party(db, selected || matches[0].id),
    mode,
  };
}
async function lock(db: Db, actor: string) {
  await db`SELECT id FROM wedding_rsvp.settings WHERE id=1 FOR UPDATE`;
  await db`SELECT set_config('wedding_rsvp.actor', ${actor}, true)`;
}
async function receipt(
  db: Db,
  requestId: string,
  scope: string,
  payload: unknown,
) {
  const [r] =
    await db`SELECT * FROM wedding_rsvp.receipts WHERE id=${requestId}`;
  if (r && (r.scope !== scope || r.payload_hash !== hash(payload)))
    throw new RsvpError(
      'This save request was already used. Reload before saving.',
      409,
    );
  return r?.result;
}
async function remember(
  db: Db,
  requestId: string,
  scope: string,
  payload: unknown,
  result: unknown,
) {
  await db`INSERT INTO wedding_rsvp.receipts(id,scope,payload_hash,result) VALUES(${requestId},${scope},${hash(payload)},${db.json(result as postgres.JSONValue)})`;
}
export async function submit(
  db: postgres.Sql,
  input: Submission | DeclineSubmission,
): Promise<Party> {
  return (await db.begin(async (tx) => {
    await lock(tx, `party:${input.partyId}`);
    const previous = await receipt(tx, input.requestId, input.partyId, input);
    if (previous) return previous as Party;
    const { mode } = await settings(tx);
    if (
      mode === 'closed' ||
      (mode === 'declines_only' &&
        !('action' in input) &&
        input.responses.some((r) => r.attendance === 'yes'))
    )
      throw new RsvpError(
        mode === 'closed'
          ? 'RSVP is currently closed.'
          : 'You can let us know you cannot attend now. Yes responses open with invitations.',
        403,
      );
    const current = await party(tx, input.partyId);
    if (current.revision !== input.revision)
      throw new RsvpError(
        'Someone updated this party while you were editing. Look up your name again to review the latest responses.',
        409,
      );
    const responses =
      'action' in input
        ? (input.guestIds.flatMap((guestId) => {
            const guest = current.guests.find((g) => g.id === guestId);
            if (!guest)
              throw new RsvpError(
                'This guest does not belong to your party.',
                403,
              );
            if (!guest.events.length)
              throw new RsvpError(
                'Please contact Will or Jackie about this guest’s invitation.',
              );
            return guest.events.map((event) => ({
              guestId,
              eventId: event.eventId,
              attendance: 'no' as const,
            }));
          }) as Submission['responses'])
        : input.responses;
    const names = new Map<string, { first: string; last: string }>();
    for (const r of responses) {
      const g = current.guests.find((g) => g.id === r.guestId);
      if (!g || !g.events.some((e) => e.eventId === r.eventId))
        throw new RsvpError('This guest is not invited to that event.', 403);
      if (r.firstName && r.lastName) {
        if (
          !g.isUnnamedPlusOne &&
          (r.firstName !== g.firstName || r.lastName !== g.lastName)
        )
          throw new RsvpError(
            'Please contact Will or Jackie to correct an invited guest’s name.',
          );
        const prior = names.get(g.id);
        if (prior && (prior.first !== r.firstName || prior.last !== r.lastName))
          throw new RsvpError('Use the same guest name for every event.');
        names.set(g.id, { first: r.firstName, last: r.lastName });
      }
    }
    for (const r of responses) {
      const g = current.guests.find((g) => g.id === r.guestId)!;
      if (
        r.attendance === 'yes' &&
        g.isUnnamedPlusOne &&
        !(names.has(g.id) || (g.firstName && g.lastName))
      )
        throw new RsvpError(
          'Please enter your plus-one’s first and last name if they are attending.',
        );
      await tx`UPDATE wedding_rsvp.invitations SET attendance=${r.attendance}, meal_choice=${r.mealChoice === undefined ? g.events.find((e) => e.eventId === r.eventId)!.mealChoice : r.mealChoice},dietary_restrictions=${r.dietaryRestrictions === undefined ? g.events.find((e) => e.eventId === r.eventId)!.dietaryRestrictions : r.dietaryRestrictions},responded_at=now(),updated_at=now() WHERE guest_id=${r.guestId} AND event_id=${r.eventId}`;
    }
    for (const [guestId, n] of names)
      await tx`UPDATE wedding_rsvp.guests SET first_name=${n.first},last_name=${n.last},normalized_first_name=${normalizeName(n.first)},normalized_last_name=${normalizeName(n.last)},updated_at=now() WHERE id=${guestId}`;
    await tx`UPDATE wedding_rsvp.parties SET revision=revision+1,updated_at=now() WHERE id=${input.partyId}`;
    await tx`UPDATE wedding_rsvp.settings SET revision=revision+1 WHERE id=1`;
    const result = await party(tx, input.partyId);
    await remember(tx, input.requestId, input.partyId, input, result);
    return result;
  })) as unknown as Party;
}
async function plan(db: Db, rows: ImportRow[]): Promise<ImportPlan> {
  const { revision } = await settings(db);
  const parties = await db`SELECT * FROM wedding_rsvp.parties`,
    guests = await db`SELECT * FROM wedding_rsvp.guests`,
    events = await db`SELECT id FROM wedding_rsvp.events`,
    invitations =
      await db`SELECT guest_id,event_id FROM wedding_rsvp.invitations`;
  const result: ImportPlan = {
    hash: hash(rows),
    revision,
    partiesAdded: 0,
    partiesUpdated: 0,
    guestsAdded: 0,
    guestsUpdated: 0,
    invitationsAdded: 0,
    rows: rows.length,
    warnings: [],
  };
  const seen = new Set<string>();
  for (const r of rows) {
    if (r.eventIds.some((e) => !events.some((x) => x.id === e)))
      throw new RsvpError(`Row ${r.row}: Unknown event ID.`);
    if (!seen.has(r.partyId)) {
      const p = parties.find((p) => p.id === r.partyId);
      if (!p) result.partiesAdded++;
      else if (
        (r.displayName !== null && r.displayName !== p.display_name) ||
        (r.greeting !== null && r.greeting !== p.greeting)
      )
        result.partiesUpdated++;
      seen.add(r.partyId);
    }
    const g =
      guests.find((g) => g.id === r.guestId) ||
      (!r.explicitId
        ? guests.find(
            (g) => g.party_id === r.partyId && g.import_key === r.importKey,
          )
        : undefined);
    if (
      g &&
      (g.party_id !== r.partyId || g.is_unnamed_plus_one !== r.isUnnamedPlusOne)
    )
      throw new RsvpError(
        `Row ${r.row}: Existing guest's party or plus-one status cannot be changed by import.`,
      );
    // Resolve a stable original import key after a plus-one has been named.
    if (g) r.guestId = g.id;
    if (!g) result.guestsAdded++;
    else if (
      (r.firstName !== null && r.firstName !== g.first_name) ||
      (r.lastName !== null && r.lastName !== g.last_name) ||
      (r.preferredName !== null && r.preferredName !== g.preferred_name)
    )
      result.guestsUpdated++;
    if (g?.first_name && !r.firstName)
      result.warnings.push(
        `Row ${r.row}: Preserving the existing plus-one name.`,
      );
    if (!r.eventIds.length)
      result.warnings.push(`Row ${r.row}: No new event invitations selected.`);
    result.invitationsAdded += r.eventIds.filter(
      (e) =>
        !invitations.some((i) => i.guest_id === r.guestId && i.event_id === e),
    ).length;
  }
  if (new Set(rows.map((r) => r.guestId)).size !== rows.length)
    throw new RsvpError('CSV resolves multiple rows to the same guest.');
  result.hash = hash(rows);
  return result;
}
export async function previewImport(
  db: postgres.Sql,
  csv: string,
  eventIds: string[],
) {
  return db.begin('isolation level repeatable read read only', async (tx) =>
    plan(tx, importRows(csv, eventIds)),
  );
}
export async function commitImport(
  db: postgres.Sql,
  csv: string,
  eventIds: string[],
  expectedRevision: number,
  expectedHash: string,
  requestId: string,
) {
  return db.begin(async (tx) => {
    await lock(tx, 'admin:import');
    const payload = { csv, eventIds, expectedRevision, expectedHash };
    const previous = await receipt(tx, requestId, 'import', payload);
    if (previous) return previous;
    const rows = importRows(csv, eventIds),
      preview = await plan(tx, rows);
    if (preview.revision !== expectedRevision || preview.hash !== expectedHash)
      throw new RsvpError(
        'The guest list changed. Preview the import again before applying it.',
        409,
      );
    for (const r of rows) {
      await tx`INSERT INTO wedding_rsvp.parties(id,display_name,greeting) VALUES(${r.partyId},${r.displayName},${r.greeting}) ON CONFLICT(id) DO UPDATE SET display_name=coalesce(EXCLUDED.display_name,parties.display_name),greeting=coalesce(EXCLUDED.greeting,parties.greeting),updated_at=now()`;
      await tx`INSERT INTO wedding_rsvp.guests(id,party_id,import_key,first_name,last_name,preferred_name,normalized_first_name,normalized_last_name,is_unnamed_plus_one) VALUES(${r.guestId},${r.partyId},${r.importKey},${r.firstName},${r.lastName},${r.preferredName},${r.firstName ? normalizeName(r.firstName) : null},${r.lastName ? normalizeName(r.lastName) : null},${r.isUnnamedPlusOne}) ON CONFLICT(id) DO UPDATE SET first_name=coalesce(EXCLUDED.first_name,guests.first_name),last_name=coalesce(EXCLUDED.last_name,guests.last_name),preferred_name=coalesce(EXCLUDED.preferred_name,guests.preferred_name),normalized_first_name=coalesce(EXCLUDED.normalized_first_name,guests.normalized_first_name),normalized_last_name=coalesce(EXCLUDED.normalized_last_name,guests.normalized_last_name),updated_at=now()`;
      for (const event of r.eventIds)
        await tx`INSERT INTO wedding_rsvp.invitations(id,guest_id,event_id) VALUES(${randomUUID()},${r.guestId},${event}) ON CONFLICT(guest_id,event_id) DO NOTHING`;
    }
    for (const partyId of new Set(rows.map((r) => r.partyId)))
      await tx`UPDATE wedding_rsvp.parties SET revision=revision+1,updated_at=now() WHERE id=${partyId}`;
    await tx`UPDATE wedding_rsvp.settings SET revision=revision+1 WHERE id=1`;
    await remember(tx, requestId, 'import', payload, preview);
    return preview;
  });
}
export async function adminData(db: Db) {
  const events =
    await db`SELECT id,name,starts_at AS "startsAt" FROM wedding_rsvp.events ORDER BY name`;
  const guests =
    await db`SELECT g.id AS guest_id,g.party_id,p.display_name,p.greeting,g.first_name,g.last_name,g.preferred_name,g.is_unnamed_plus_one,i.event_id,e.name AS event_name,i.attendance,i.meal_choice,i.dietary_restrictions,i.responded_at FROM wedding_rsvp.guests g JOIN wedding_rsvp.parties p ON p.id=g.party_id LEFT JOIN wedding_rsvp.invitations i ON i.guest_id=g.id LEFT JOIN wedding_rsvp.events e ON e.id=i.event_id ORDER BY p.id,g.id,e.name`;
  return { ...(await settings(db)), events, guests };
}
export async function setMode(
  db: postgres.Sql,
  mode: RsvpMode,
  expectedRevision: number,
) {
  if (
    mode !== 'closed' &&
    process.env.NODE_ENV === 'production' &&
    process.env.RSVP_RECOVERY_READY !== 'true'
  )
    throw new RsvpError(
      'Verify backups and a restore drill, then set RSVP_RECOVERY_READY before opening RSVP.',
      409,
    );
  return db.begin(async (tx) => {
    await lock(tx, 'admin:mode');
    if ((await settings(tx)).revision !== expectedRevision)
      throw new RsvpError('Reload before changing RSVP availability.', 409);
    await tx`UPDATE wedding_rsvp.settings SET mode=${mode},revision=revision+1 WHERE id=1`;
    return settings(tx);
  });
}
