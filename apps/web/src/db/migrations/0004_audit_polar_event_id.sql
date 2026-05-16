-- Migration number: 0004 	 2026-05-16T04:39:38.348Z

-- Polar webhook idempotency: nullable column with UNIQUE constraint.
-- SQLite UNIQUE allows multiple NULLs, so non-Polar audit rows are unaffected.
-- Polar onPayload writes `${type}:${data.id}:${timestamp}` here, and INSERT OR IGNORE
-- dedupes redelivered events.
ALTER TABLE audit_log ADD COLUMN polar_event_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_audit_log_polar_event_id ON audit_log (polar_event_id);
