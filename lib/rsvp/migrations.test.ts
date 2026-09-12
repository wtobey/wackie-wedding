import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { applyMigrations } from "../../scripts/rsvp/migrations";

test(
  "deployment migrations preserve photo data, run once, and reject checksum drift",
  { skip: !process.env.RSVP_TEST_DATABASE_URL },
  async () => {
    const url = new URL(process.env.RSVP_TEST_DATABASE_URL!);
    assert(["localhost", "127.0.0.1"].includes(url.hostname));
    const root = postgres(url.toString(), { max: 1 });
    const name = "rsvp_migration_" + randomUUID().replaceAll("-", "");
    await root.unsafe(`CREATE DATABASE ${name}`);
    url.pathname = "/" + name;
    const db = postgres(url.toString(), { max: 1 });
    try {
      await db`CREATE SCHEMA wedding_admin`;
      await db`CREATE TABLE wedding_admin.library(id integer PRIMARY KEY, photos jsonb)`;
      await db`INSERT INTO wedding_admin.library VALUES(1,${db.json([{ id: "preserved-photo" }])})`;
      assert.deepEqual(await applyMigrations(db), ["001_initial.sql"]);
      assert.deepEqual(await applyMigrations(db), []);
      assert.deepEqual(
        (await db`SELECT photos FROM wedding_admin.library`)[0].photos,
        [{ id: "preserved-photo" }],
      );
      assert.equal(
        (await db`SELECT mode FROM wedding_rsvp.settings`)[0].mode,
        "closed",
      );
      await db`UPDATE wedding_rsvp.migrations SET checksum='invalid'`;
      await assert.rejects(() => applyMigrations(db), /modified/);
      assert.equal(
        (await db`SELECT count(*)::int AS count FROM wedding_rsvp.events`)[0]
          .count,
        4,
      );
    } finally {
      await db.end();
      await root.unsafe(`DROP DATABASE ${name}`);
      await root.end();
    }
  },
);
