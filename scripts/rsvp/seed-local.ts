import postgres from 'postgres';
import { databaseUrl } from './backup';
import { previewImport, commitImport, setMode } from '../../lib/rsvp/service';
async function main() {
  const connection = databaseUrl(),
    url = new URL(connection);
  if (
    !['localhost', '127.0.0.1'].includes(url.hostname) ||
    !url.pathname.includes('dev')
  )
    throw new Error('Fixtures may only be loaded into a local dev database.');
  const db = postgres(connection, { max: 1, prepare: false });
  const csv = `party_id,display_name,greeting,first_name,last_name,preferred_name,is_unnamed_plus_one
kelly,Kelly Bond and Guest,We look forward to celebrating with you!,Kelly,Bond,,false
kelly,Kelly Bond and Guest,We look forward to celebrating with you!,,,,true
smith-family,The Smith Family,,John,Smith,,false
smith-couple,John and Sarah Smith,,John,Smith,,false
smith-couple,John and Sarah Smith,,Sarah,Smith,,false`;
  try {
    const p = await previewImport(db, csv, ['wedding', 'brunch']);
    await commitImport(
      db,
      csv,
      ['wedding', 'brunch'],
      p.revision,
      p.hash,
      crypto.randomUUID(),
    );
    const [s] = await db`SELECT revision FROM wedding_rsvp.settings WHERE id=1`;
    await setMode(db, 'declines_only', s.revision);
    console.log('Local fixtures ready. Try Kelly Bond or John Smith.');
  } finally {
    await db.end();
  }
}
main().catch(() => {
  console.error('Local fixture import failed.');
  process.exitCode = 1;
});
