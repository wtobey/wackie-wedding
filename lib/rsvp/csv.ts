import { createHash } from 'node:crypto';
import type { ImportRow } from './types';
import { id, normalizeName, RsvpError, text } from './validation';
export const hash = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function csvSource(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 1_000_000)
    throw new RsvpError('Choose a CSV smaller than 1 MB.');
  return value;
}
// RFC 4180: quoted commas, escaped quotes and embedded newlines are supported.
export function parseCsv(source: string): string[][] {
  if (source.length > 1_000_000)
    throw new RsvpError('CSV must be smaller than 1 MB.');
  const rows: string[][] = [];
  let row: string[] = [],
    cell = '',
    quoted = false,
    closed = false;
  source = source.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (quoted) {
      if (c === '"') {
        if (source[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else cell += c;
    } else if (c === ',' || c === '\n') {
      row.push(cell);
      cell = '';
      closed = false;
      if (c === '\n') {
        if (row.some(Boolean)) rows.push(row);
        row = [];
      }
    } else if (c === '"' && !cell && !closed) quoted = true;
    else if (closed || c === '"')
      throw new RsvpError(`Malformed CSV near row ${rows.length + 1}.`);
    else cell += c;
  }
  if (quoted) throw new RsvpError('CSV contains an unclosed quote.');
  row.push(cell);
  if (row.some(Boolean)) rows.push(row);
  return rows;
}
export function importRows(csv: string, defaultEvents: string[]): ImportRow[] {
  const [headers, ...data] = parseCsv(csv);
  const required = [
    'party_id',
    'display_name',
    'greeting',
    'first_name',
    'last_name',
    'preferred_name',
    'is_unnamed_plus_one',
  ];
  if (
    !headers ||
    required.some((h) => !headers.includes(h)) ||
    new Set(headers).size !== headers.length
  )
    throw new RsvpError(
      `CSV needs these columns: ${required.join(', ')}. Optional: guest_id, event_ids.`,
    );
  if (!data.length || data.length > 2000)
    throw new RsvpError('Import between 1 and 2,000 guests at a time.');
  const seen = new Set<string>(),
    parties = new Map<string, string>();
  const errors: string[] = [];
  const result = data.map((cells, index): ImportRow | null => {
    try {
      if (cells.length !== headers.length)
        throw new RsvpError('Column count does not match the header.');
      const r = Object.fromEntries(headers.map((h, i) => [h, cells[i].trim()]));
      const partyId = id(r.party_id, 'party_id');
      if (
        !['true', 'false', '1', '0', ''].includes(
          r.is_unnamed_plus_one.toLowerCase(),
        )
      )
        throw new RsvpError('is_unnamed_plus_one must be true or false.');
      const plus = ['true', '1'].includes(r.is_unnamed_plus_one.toLowerCase());
      const firstName = r.first_name ? text(r.first_name, 'first_name') : null,
        lastName = r.last_name ? text(r.last_name, 'last_name') : null;
      if ((!firstName || !lastName) && !(plus && !firstName && !lastName))
        throw new RsvpError(
          'Only an unnamed plus-one may have blank first and last names.',
        );
      if (firstName && (!normalizeName(firstName) || !normalizeName(lastName!)))
        throw new RsvpError('Names must include letters or numbers.');
      const displayName = r.display_name
          ? text(r.display_name, 'display_name', 200)
          : null,
        greeting = r.greeting ? text(r.greeting, 'greeting', 500) : null;
      const fields = JSON.stringify([displayName, greeting]);
      if (parties.has(partyId) && parties.get(partyId) !== fields)
        throw new RsvpError('Repeated party fields must match.');
      parties.set(partyId, fields);
      const importKey = r.guest_id
        ? `id:${id(r.guest_id, 'guest_id')}`
        : firstName
          ? `name:${normalizeName(firstName)}:${normalizeName(lastName!)}`
          : 'unnamed-plus-one';
      const key = `${partyId}:${importKey}`;
      if (seen.has(key))
        throw new RsvpError(
          'Duplicate guest. Use distinct guest_id values for multiple unnamed plus-ones or identical names.',
        );
      seen.add(key);
      const guestId = r.guest_id || `g_${hash(key).slice(0, 32)}`;
      const eventIds = [
        ...new Set(
          (r.event_ids ? r.event_ids.split(';') : defaultEvents).map((e) =>
            id(e, 'event_ids'),
          ),
        ),
      ];
      return {
        row: index + 2,
        partyId,
        displayName,
        greeting,
        guestId,
        explicitId: Boolean(r.guest_id),
        importKey,
        firstName,
        lastName,
        preferredName: r.preferred_name
          ? text(r.preferred_name, 'preferred_name')
          : null,
        isUnnamedPlusOne: plus,
        eventIds,
      };
    } catch (error) {
      errors.push(
        `Row ${index + 2}: ${error instanceof Error ? error.message : 'Invalid row.'}`,
      );
      return null;
    }
  });
  if (errors.length)
    throw new RsvpError('Fix the CSV rows before importing.', 400, errors);
  return result.filter((r): r is ImportRow => r !== null);
}
export function encodeCsv(rows: (string | null)[][]) {
  return rows
    .map((r) => r.map((v) => `"${(v || '').replace(/"/g, '""')}"`).join(','))
    .join('\r\n');
}
