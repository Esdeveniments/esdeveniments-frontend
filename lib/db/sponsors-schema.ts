/**
 * Sponsor database schema constants.
 *
 * Extracted to a separate file (no "server-only") so both the runtime
 * code (lib/db/turso.ts) and CLI scripts (scripts/init-sponsors-db.ts)
 * can import the same single source of truth.
 */

export const SPONSORS_SCHEMA = `
CREATE TABLE IF NOT EXISTS sponsors (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  business_name TEXT NOT NULL,
  image_url TEXT,
  target_url TEXT,
  places TEXT NOT NULL,
  geo_scope TEXT NOT NULL CHECK (geo_scope IN ('town','region','country')),
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_image' CHECK (status IN ('pending_image','active','expired','cancelled')),
  kind TEXT NOT NULL DEFAULT 'paid' CHECK (kind IN ('paid','backfill')),
  stripe_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  customer_email TEXT,
  amount_paid INTEGER,
  currency TEXT,
  duration TEXT,
  duration_days INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

export const SPONSORS_INDEXES = [
  "CREATE INDEX IF NOT EXISTS idx_sponsors_status ON sponsors(status);",
  "CREATE INDEX IF NOT EXISTS idx_sponsors_dates ON sponsors(start_date, end_date);",
  "CREATE INDEX IF NOT EXISTS idx_sponsors_session ON sponsors(stripe_session_id);",
];

/**
 * Column added after the table shipped. `ALTER TABLE ADD COLUMN` fails with
 * "duplicate column name" once applied; callers ignore that error.
 */
export const SPONSORS_MIGRATIONS = [
  "ALTER TABLE sponsors ADD COLUMN kind TEXT NOT NULL DEFAULT 'paid' CHECK (kind IN ('paid','backfill'));",
];

export function isDuplicateColumnError(error: unknown): boolean {
  return error instanceof Error && /duplicate column name/i.test(error.message);
}
