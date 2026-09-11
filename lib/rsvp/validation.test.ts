import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeName, parseSubmission } from './validation';
import { importRows, parseCsv, csvSource, encodeCsv } from './csv';
test('normalization handles apostrophes, accents and repeated spaces', () => {
  assert.equal(normalizeName('  Wíll  '), 'will');
  assert.equal(normalizeName('O’Connor'), 'oconnor');
  assert.equal(normalizeName('  Mary   JANE '), 'mary jane');
});
test('CSV handles escaped quotes, commas and multiline greetings', () => {
  assert.deepEqual(
    parseCsv('name,greeting\n"Alex, Jr.","Hello ""friend""\nWelcome"'),
    [
      ['name', 'greeting'],
      ['Alex, Jr.', 'Hello "friend"\nWelcome'],
    ],
  );
  assert.throws(() => parseCsv('a\n"broken'));
  assert.throws(() => parseCsv('a\n"x"oops'));
});
const header =
  'party_id,display_name,greeting,first_name,last_name,preferred_name,is_unnamed_plus_one\n';
test('CSV rejects duplicates, inconsistent parties, and incomplete names with row errors', () => {
  for (const rows of [
    'p,Party,,John,Smith,,false\np,Party,,John,Smith,,false',
    'p,Party,,John,Smith,,false\np,Other,,Jane,Smith,,false',
    'p,Party,,,,,false',
    'p,Party,,Alex,,,true',
  ])
    assert.throws(() => importRows(header + rows, ['wedding']));
  const rows = importRows(header + 'p,Party,,,,,true', ['wedding']);
  assert.equal(rows[0].firstName, null);
});
test('submission requires revision, unique guest/event pairs and complete supplied names', () => {
  const r = { guestId: 'g', eventId: 'wedding', attendance: 'yes' };
  assert.throws(() => parseSubmission({ partyId: 'p', responses: [r] }));
  assert.throws(() =>
    parseSubmission({
      partyId: 'p',
      revision: 0,
      requestId: 'a',
      responses: [r, r],
    }),
  );
  assert.throws(() =>
    parseSubmission({
      partyId: 'p',
      revision: 0,
      requestId: 'a',
      responses: [{ ...r, firstName: 'Alex' }],
    }),
  );
});

test('CSV exports with Windows line endings round trip through request validation', () => {
  const csv = encodeCsv([
    [
      'party_id',
      'display_name',
      'greeting',
      'first_name',
      'last_name',
      'preferred_name',
      'is_unnamed_plus_one',
    ],
    ['p', 'Party', 'Welcome!', 'Alex', 'Morgan', null, 'false'],
  ]);
  assert.equal(importRows(csvSource(csv), ['wedding'])[0].firstName, 'Alex');
});
