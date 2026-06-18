/**
 * Push subscription schema constants.
 *
 * No "server-only" — imported by CLI scripts as well as runtime code.
 */

export const PUSH_SUBSCRIPTIONS_SCHEMA = `
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

export const PUSH_SUBSCRIPTIONS_INDEXES = [
  "CREATE INDEX IF NOT EXISTS idx_push_endpoint ON push_subscriptions(endpoint);",
];
