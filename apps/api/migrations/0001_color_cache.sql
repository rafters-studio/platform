-- Migration number: 0001 	 2026-10-02T00:31:08.006Z

-- One row per color with generated intelligence. The rest of ColorValue is
-- recomputed from the key, so only the model's output is stored.
-- ok_l, ok_a, ok_b are the OKLab coordinates of the keyed color, used for the
-- near match (deltaE-OK <= 0.02).
CREATE TABLE color_cache (
  key TEXT PRIMARY KEY NOT NULL,
  ok_l REAL NOT NULL,
  ok_a REAL NOT NULL,
  ok_b REAL NOT NULL,
  intelligence TEXT NOT NULL,
  model TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX color_cache_oklab ON color_cache (ok_l, ok_a, ok_b);
