/**
 * The few column types SQLite and Postgres spell differently. Entities
 * import these instead of hard-coding one database's name.
 */
export const isPostgres = !!process.env.DATABASE_URL;

/** A point in time. */
export const DATETIME = isPostgres ? 'timestamptz' : 'datetime';
