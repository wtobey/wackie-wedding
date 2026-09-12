import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import type postgres from "postgres";

export async function applyMigrations(db: postgres.Sql) {
  return db.begin(async (tx) => {
    await tx`SET LOCAL lock_timeout = '10s'`;
    await tx`SELECT pg_advisory_xact_lock(62478231)`;
    await tx`CREATE SCHEMA IF NOT EXISTS wedding_rsvp`;
    await tx`CREATE TABLE IF NOT EXISTS wedding_rsvp.migrations(name text PRIMARY KEY, checksum text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())`;
    const applied: string[] = [];
    for (const name of readdirSync("migrations/rsvp")
      .filter((n) => n.endsWith(".sql"))
      .sort()) {
      const sql = readFileSync(`migrations/rsvp/${name}`, "utf8");
      const checksum = createHash("sha256").update(sql).digest("hex");
      const [previous] =
        await tx`SELECT checksum FROM wedding_rsvp.migrations WHERE name=${name}`;
      if (previous) {
        if (previous.checksum !== checksum)
          throw new Error(
            "An applied migration was modified; add a new migration instead.",
          );
        continue;
      }
      await tx.unsafe(sql);
      await tx`INSERT INTO wedding_rsvp.migrations(name,checksum) VALUES(${name},${checksum})`;
      applied.push(name);
    }
    return applied;
  });
}
