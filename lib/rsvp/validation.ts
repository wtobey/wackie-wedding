import type { RsvpResponse, Submission, DeclineSubmission } from './types';
export class RsvpError extends Error {
  constructor(
    message: string,
    public status = 400,
    public details?: unknown,
  ) {
    super(message);
  }
}
export function normalizeName(value: string) {
  return value
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('en-US')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .trim()
    .replace(/\s+/g, ' ');
}
export function text(value: unknown, label: string, max = 100): string {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.length > max ||
    /[\u0000-\u0008\u000b-\u001f]/.test(value)
  )
    throw new RsvpError(`Please check ${label}.`);
  return value.trim();
}
export function id(value: unknown, label = 'the ID'): string {
  const result = text(value, label, 128);
  if (!/^[a-zA-Z0-9_-]+$/.test(result))
    throw new RsvpError(
      `Please check ${label}. Use letters, numbers, dashes or underscores.`,
    );
  return result;
}
export function revision(value: unknown) {
  if (!Number.isSafeInteger(value) || Number(value) < 0)
    throw new RsvpError('Reload the latest information before saving.', 409);
  return Number(value);
}
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new RsvpError('Invalid request.');
  return value as Record<string, unknown>;
}
export function nullable(value: unknown, label: string, max = 500) {
  return value === null || value === '' ? null : text(value, label, max);
}
export function parseSubmission(value: unknown): Submission {
  const body = object(value);
  if (
    !Array.isArray(body.responses) ||
    !body.responses.length ||
    body.responses.length > 200
  )
    throw new RsvpError('Choose a response before saving.');
  const seen = new Set<string>();
  const responses = body.responses.map((input) => {
    const r = object(input);
    const guestId = id(r.guestId, 'the guest');
    const eventId = id(r.eventId, 'the event');
    const key = `${guestId}:${eventId}`;
    if (seen.has(key))
      throw new RsvpError(
        'A guest has more than one response for the same event.',
      );
    seen.add(key);
    if (r.attendance !== 'yes' && r.attendance !== 'no')
      throw new RsvpError('Choose yes or no for each response.');
    const result: RsvpResponse = { guestId, eventId, attendance: r.attendance };
    if ('mealChoice' in r)
      result.mealChoice = nullable(r.mealChoice, 'the meal choice', 100);
    if ('dietaryRestrictions' in r)
      result.dietaryRestrictions = nullable(
        r.dietaryRestrictions,
        'dietary restrictions',
        1000,
      );
    if ('firstName' in r || 'lastName' in r) {
      result.firstName = text(r.firstName, 'the guest’s first name');
      result.lastName = text(r.lastName, 'the guest’s last name');
      if (!normalizeName(result.firstName) || !normalizeName(result.lastName))
        throw new RsvpError('Please enter a real guest name.');
    }
    return result;
  });
  return {
    partyId: id(body.partyId, 'the party'),
    revision: revision(body.revision),
    requestId: id(body.requestId, 'the save request'),
    responses,
  };
}

export function parseDecline(value: unknown): DeclineSubmission {
  const input = object(value);
  if (input.action !== 'decline' || 'responses' in input)
    throw new RsvpError('We are only accepting declines right now.', 403);
  if (
    !Array.isArray(input.guestIds) ||
    !input.guestIds.length ||
    input.guestIds.length > 200
  )
    throw new RsvpError('Select who will not be attending.');
  const guestIds = input.guestIds.map((value) => id(value, 'the guest'));
  if (new Set(guestIds).size !== guestIds.length)
    throw new RsvpError('Select each guest only once.');
  return {
    action: 'decline',
    partyId: id(input.partyId, 'the party'),
    revision: revision(input.revision),
    requestId: id(input.requestId, 'the save request'),
    guestIds,
  };
}
