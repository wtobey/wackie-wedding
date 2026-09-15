import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { applyMigrations } from '../../scripts/rsvp/migrations';
import { signupInput, subscribeEmail } from './service';

test('email signup validates addresses and entry points without stripping plus tags', () => {
  assert.deepEqual(signupInput({ email: ' Guest+Hotel@Example.com ', source: 'password' }), { email: 'guest+hotel@example.com', source: 'password' });
  for (const email of ['', null, 'a@@example.com', '.a@example.com', 'a..b@example.com', 'a@-example.com', 'a@localhost', 'a b@example.com', 'a@example.com\r\nBcc:spam@example.com', `${'a'.repeat(65)}@example.com`])
    assert.throws(() => signupInput({ email, source: 'password' }));
  assert.throws(() => signupInput({ email: 'a@example.com', source: 'unknown' }));
});

test('concurrent signup retries preserve the original consent and anonymous reads are denied', { skip: !process.env.RSVP_TEST_DATABASE_URL }, async () => {
  const url = new URL(process.env.RSVP_TEST_DATABASE_URL!);
  assert(['localhost', '127.0.0.1'].includes(url.hostname));
  const root = postgres(url.toString(), { max: 1 });
  const name = 'subscriber_test_' + randomUUID().replaceAll('-', '');
  await root.unsafe(`CREATE DATABASE ${name}`);
  url.pathname = '/' + name;
  const db = postgres(url.toString(), { max: 4 });
  try {
    await applyMigrations(db);
    const input = signupInput({ email: ' Test+hotel@Example.com ', source: 'password' });
    await subscribeEmail(db, input);
    const before = await db`SELECT * FROM wedding_rsvp.email_subscribers`;
    await Promise.all(Array.from({ length: 8 }, () => subscribeEmail(db, { ...input, source: 'accommodations' })));
    assert.deepEqual(await db`SELECT * FROM wedding_rsvp.email_subscribers`, before);
    assert.equal(before[0].email, 'test+hotel@example.com');
    assert.equal(before[0].consent_version, 'hotel-booking-updates-v1');
    assert.equal((await db`SELECT relrowsecurity FROM pg_class WHERE oid='wedding_rsvp.email_subscribers'::regclass`)[0].relrowsecurity, true);
    await db.unsafe('CREATE ROLE subscriber_anonymous NOLOGIN');
    await db.unsafe('GRANT USAGE ON SCHEMA wedding_rsvp TO subscriber_anonymous');
    await assert.rejects(() => db.begin(async tx => {
      await tx.unsafe('SET LOCAL ROLE subscriber_anonymous');
      await tx`SELECT * FROM wedding_rsvp.email_subscribers`;
    }), /permission denied/);
  } finally {
    await db.end();
    await root.unsafe(`DROP DATABASE ${name}`);
    await root.unsafe('DROP ROLE IF EXISTS subscriber_anonymous');
    await root.end();
  }
});
