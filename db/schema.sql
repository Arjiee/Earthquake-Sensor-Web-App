-- SEERS PostgreSQL schema.
-- Applied automatically by `pnpm seed` in /server, or run manually:
--   psql "$DATABASE_URL" -f db/schema.sql

CREATE TABLE IF NOT EXISTS admins (
  id            SERIAL PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'admin',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS students (
  id            TEXT PRIMARY KEY,               -- e.g. 2021-00123
  name          TEXT NOT NULL,
  year_section  TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'pending' -- pending | missing | safe | evacuated
                CHECK (status IN ('pending','missing','safe','evacuated')),
  method        TEXT NOT NULL DEFAULT '-'       -- face | qr | manual | -
                CHECK (method IN ('face','qr','manual','-')),
  has_face      BOOLEAN NOT NULL DEFAULT FALSE, -- true once a face template is enrolled
  checked_in_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS earthquakes (
  id          SERIAL PRIMARY KEY,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  magnitude   NUMERIC(3,1) NOT NULL DEFAULT 0,
  peak_g      NUMERIC(6,4) NOT NULL DEFAULT 0,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  cleared_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS event_log (
  id      SERIAL PRIMARY KEY,
  level   TEXT NOT NULL DEFAULT 'info' CHECK (level IN ('ok','warn','err','info')),
  message TEXT NOT NULL,
  ts      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Optional: raw sensor history for later analysis. The live dashboard uses the
-- WebSocket stream, but persisting readings is useful for audits.
CREATE TABLE IF NOT EXISTS sensor_readings (
  id        BIGSERIAL PRIMARY KEY,
  device_id TEXT NOT NULL,
  x         NUMERIC(7,4) NOT NULL,
  y         NUMERIC(7,4) NOT NULL,
  z         NUMERIC(7,4) NOT NULL,
  peak_g    NUMERIC(6,4) NOT NULL,
  magnitude NUMERIC(3,1) NOT NULL,
  ts        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_log_ts ON event_log (ts DESC);
CREATE INDEX IF NOT EXISTS idx_readings_ts ON sensor_readings (ts DESC);
