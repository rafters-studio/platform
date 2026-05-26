-- Migration number: 0005 	 2026-05-26T21:47:01.511Z
-- @better-auth/api-key v1.6.11 schema. Mirrors apiKeySchema() from the plugin source.
-- Used by surface workers (rafters, eavesdrop, etc.) for service-to-service auth
-- against /api/uncertainty/* and (future) /api/v1/meter.

CREATE TABLE apikey (
  id text PRIMARY KEY NOT NULL,
  config_id text NOT NULL DEFAULT 'default',
  name text,
  start text,
  reference_id text NOT NULL,
  prefix text,
  key text NOT NULL,
  refill_interval integer,
  refill_amount integer,
  last_refill_at integer,
  enabled integer NOT NULL DEFAULT 1,
  rate_limit_enabled integer NOT NULL DEFAULT 1,
  rate_limit_time_window integer,
  rate_limit_max integer,
  request_count integer NOT NULL DEFAULT 0,
  remaining integer,
  last_request integer,
  expires_at integer,
  created_at integer NOT NULL,
  updated_at integer NOT NULL,
  permissions text,
  metadata text
);

CREATE INDEX apikey_config_id_idx ON apikey (config_id);
CREATE INDEX apikey_reference_id_idx ON apikey (reference_id);
CREATE INDEX apikey_key_idx ON apikey (key);
