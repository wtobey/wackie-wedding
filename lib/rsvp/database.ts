import postgres from 'postgres';
import { RsvpError } from './validation';
export type Db = postgres.Sql | postgres.TransactionSql;
export async function withRsvpDatabase<T>(
  operation: (db: postgres.Sql) => Promise<T>,
): Promise<T> {
  const connection = process.env.RSVP_DATABASE_URL || process.env.POSTGRES_URL;
  if (!connection || connection === '[SENSITIVE]')
    throw new RsvpError(
      'RSVP is not available yet. Please try again later.',
      503,
    );
  const db = postgres(connection, {
    max: 1,
    prepare: false,
    connect_timeout: 5,
    idle_timeout: 5,
    connection: {
      statement_timeout: 10000,
      lock_timeout: 5000,
      application_name: 'wedding-rsvp',
    },
  });
  try {
    const [schema] =
      await db`SELECT to_regclass('wedding_rsvp.settings') AS ready`;
    if (!schema.ready)
      throw new RsvpError(
        'RSVP is not available yet. Please try again later.',
        503,
      );
    return await operation(db);
  } finally {
    await db.end({ timeout: 1 });
  }
}
