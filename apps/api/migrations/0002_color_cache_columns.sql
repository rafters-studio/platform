-- Migration number: 0002 	 2026-10-02T08:24:29.498Z

-- The cache holds no data yet, so it is dropped and recreated with one column
-- per intelligence field. label is nullable and unique ignoring case; a color
-- whose label candidates all failed is stored with a NULL label.
DROP TABLE color_cache;

CREATE TABLE color_cache (
  key TEXT PRIMARY KEY NOT NULL,
  ok_l REAL NOT NULL,
  ok_a REAL NOT NULL,
  ok_b REAL NOT NULL,
  label TEXT,
  reasoning TEXT NOT NULL,
  emotional_impact TEXT NOT NULL,
  cultural_context TEXT NOT NULL,
  accessibility_notes TEXT NOT NULL,
  usage_guidance TEXT NOT NULL,
  balancing_guidance TEXT NOT NULL,
  model TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX color_cache_oklab ON color_cache (ok_l, ok_a, ok_b);

CREATE UNIQUE INDEX color_cache_label ON color_cache (label COLLATE NOCASE);
