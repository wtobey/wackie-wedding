import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import postgres from 'postgres';
import {
  commitImport,
  lookup,
  party,
  previewImport,
  setMode,
  submit,
  settings,
} from './service';
import { importRows } from './csv';
const connection = process.env.RSVP_TEST_DATABASE_URL;
test(
  'PostgreSQL RSVP integrity and recovery behavior',
  { skip: !connection },
  async (t) => {
    const url = new URL(connection!);
    assert.ok(
      ['localhost', '127.0.0.1'].includes(url.hostname),
      'Tests only run against local PostgreSQL',
    );
    const root = postgres(connection!, { max: 1 }),
      name = `rsvp_test_${randomUUID().replaceAll('-', '')}`;
    await root.unsafe(`CREATE DATABASE ${name}`);
    url.pathname = `/${name}`;
    const db = postgres(url.toString(), { max: 5 });
    const csv =
      'party_id,display_name,greeting,first_name,last_name,preferred_name,is_unnamed_plus_one\np,Alex & Guest,Welcome!,Alex,Morgan,,false\np,Alex & Guest,Welcome!,,,,true\nother,Other party,,Alex,Morgan,,false';
    const rows = importRows(csv, ['wedding']),
      primary = rows[0].guestId,
      plus = rows[1].guestId,
      other = rows[2].guestId;
    async function payload(
      responses: {
        guestId: string;
        eventId: string;
        attendance: 'yes' | 'no';
        firstName?: string;
        lastName?: string;
        mealChoice?: string;
      }[],
    ) {
      return {
        partyId: 'p',
        revision: (await party(db, 'p')).revision,
        requestId: randomUUID(),
        responses,
      };
    }
    try {
      await db.begin((tx) =>
        tx.unsafe(readFileSync('migrations/rsvp/001_initial.sql', 'utf8')),
      );
      await t.test('starts closed and import retry is idempotent', async () => {
        assert.equal((await settings(db)).mode, 'closed');
        const p = await previewImport(db, csv, ['wedding']),
          requestId = randomUUID();
        await commitImport(db, csv, ['wedding'], p.revision, p.hash, requestId);
        await commitImport(db, csv, ['wedding'], p.revision, p.hash, requestId);
        assert.equal((await db`SELECT * FROM wedding_rsvp.guests`).length, 3);
        await assert.rejects(() => lookup(db, 'Alex', 'Morgan'));
        await setMode(db, 'open', (await settings(db)).revision);
      });
      await t.test(
        'lookup disambiguates without exposing unrelated parties or events',
        async () => {
          const r = await lookup(db, ' Álex ', 'Morgan');
          assert.equal(r.status, 'ambiguous');
          const chosen = await lookup(db, 'Alex', 'Morgan', 'p');
          assert.equal(chosen.status, 'found');
          if (chosen.status === 'found') {
            assert.equal(chosen.party.guests.length, 2);
            assert.deepEqual(
              chosen.party.guests[0].events.map((e) => e.eventId),
              ['wedding'],
            );
          }
          assert.equal(
            (await lookup(db, 'Jane', 'Smith', 'p')).status,
            'not_found',
          );
          assert.equal((await lookup(db, '', '')).status, 'not_found');
        },
      );
      await t.test(
        'unauthorized guests and events reject the whole save',
        async () => {
          for (const r of [
            { guestId: other, eventId: 'wedding', attendance: 'yes' as const },
            {
              guestId: primary,
              eventId: 'rehearsal-dinner',
              attendance: 'yes' as const,
            },
          ])
            await assert.rejects(() =>
              payload([
                { guestId: primary, eventId: 'wedding', attendance: 'yes' },
                r,
              ]).then((p) => submit(db, p)),
            );
          assert.equal(
            (await party(db, 'p')).guests.find((g) => g.id === primary)!
              .events[0].attendance,
            null,
          );
        },
      );
      await t.test(
        'a late validation failure rolls back data AND history',
        async () => {
          const [before] =
            await db`SELECT count(*)::int n FROM wedding_rsvp.audit_log`;
          await assert.rejects(() =>
            payload([
              { guestId: primary, eventId: 'wedding', attendance: 'yes' },
              { guestId: plus, eventId: 'wedding', attendance: 'yes' },
            ]).then((p) => submit(db, p)),
          );
          assert.equal(
            (await party(db, 'p')).guests.find((g) => g.id === primary)!
              .events[0].attendance,
            null,
          );
          const [after] =
            await db`SELECT count(*)::int n FROM wedding_rsvp.audit_log`;
          assert.equal(after.n, before.n);
        },
      );
      await t.test(
        'plus-one is named in place and retries do not duplicate mutations',
        async () => {
          const input = await payload([
            {
              guestId: primary,
              eventId: 'wedding',
              attendance: 'yes',
              mealChoice: 'vegetarian',
            },
            {
              guestId: plus,
              eventId: 'wedding',
              attendance: 'yes',
              firstName: 'Sam',
              lastName: 'O’Néil',
            },
          ]);
          const result = await submit(db, input),
            again = await submit(db, input);
          assert.deepEqual(again, result);
          const g = result.guests.find((g) => g.id === plus)!;
          assert.equal(g.firstName, 'Sam');
          assert.equal(g.isUnnamedPlusOne, true);
          assert.equal(result.displayName, 'Alex & Guest');
          assert.ok(g.events[0].respondedAt);
          assert.equal((await lookup(db, 'sam', 'oneil')).status, 'found');
          assert.equal((await db`SELECT * FROM wedding_rsvp.guests`).length, 3);
          await assert.rejects(() =>
            submit(db, {
              ...input,
              responses: [
                { guestId: primary, eventId: 'wedding', attendance: 'no' },
              ],
            }),
          );
        },
      );
      await t.test(
        'concurrent editors cannot overwrite each other',
        async () => {
          const input = await payload([
            { guestId: primary, eventId: 'wedding', attendance: 'no' },
          ]);
          const results = await Promise.allSettled([
            submit(db, input),
            submit(db, {
              ...input,
              requestId: randomUUID(),
              responses: [
                { guestId: primary, eventId: 'wedding', attendance: 'yes' },
              ],
            }),
          ]);
          assert.equal(
            results.filter((r) => r.status === 'fulfilled').length,
            1,
          );
          assert.equal(
            results.filter((r) => r.status === 'rejected').length,
            1,
          );
        },
      );
      await t.test(
        're-import preserves responses, metadata and named plus-ones',
        async () => {
          const before = await party(db, 'p'),
            p = await previewImport(db, csv, ['wedding']);
          await commitImport(
            db,
            csv,
            ['wedding'],
            p.revision,
            p.hash,
            randomUUID(),
          );
          const after = await party(db, 'p');
          assert.deepEqual(after.guests, before.guests);
          assert.equal(after.displayName, before.displayName);
          const history =
            await db`SELECT * FROM wedding_rsvp.audit_log WHERE table_name='invitations' AND operation='UPDATE'`;
          assert.ok(history.length > 0);
          assert.ok(history[0].before_data);
          assert.ok(history[0].after_data);
        },
      );
      await t.test('stale import previews fail without writing', async () => {
        const p = await previewImport(db, csv, ['brunch']);
        await submit(
          db,
          await payload([
            { guestId: primary, eventId: 'wedding', attendance: 'no' },
          ]),
        );
        await assert.rejects(() =>
          commitImport(db, csv, ['brunch'], p.revision, p.hash, randomUUID()),
        );
        assert.equal(
          (
            await db`SELECT * FROM wedding_rsvp.invitations WHERE event_id='brunch'`
          ).length,
          0,
        );
      });
      await t.test(
        'declines-only disallows yes and saves no without plus-one names',
        async () => {
          await setMode(db, 'declines_only', (await settings(db)).revision);
          await assert.rejects(() =>
            payload([
              { guestId: primary, eventId: 'wedding', attendance: 'yes' },
            ]).then((p) => submit(db, p)),
          );
          await submit(
            db,
            await payload([
              { guestId: primary, eventId: 'wedding', attendance: 'no' },
            ]),
          );
        },
      );
      await t.test(
        'database rejects deletions, audit edits and invalid nameless guests',
        async () => {
          await assert.rejects(
            () => db`DELETE FROM wedding_rsvp.guests WHERE id=${primary}`,
          );
          await assert.rejects(() => db`TRUNCATE wedding_rsvp.audit_log`);
          await assert.rejects(
            () => db`UPDATE wedding_rsvp.audit_log SET actor='changed'`,
          );
          await assert.rejects(
            () =>
              db`INSERT INTO wedding_rsvp.guests(id,party_id,import_key,first_name) VALUES('bad','p','bad','Missing surname')`,
          );
        },
      );
    } finally {
      await db.end();
      await root.unsafe(`DROP DATABASE ${name}`);
      await root.end();
    }
  },
);
