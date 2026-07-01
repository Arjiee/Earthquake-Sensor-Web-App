import { pool } from "./db.js";
import { hub } from "./hub.js";
import { config } from "./config.js";
import type { EarthquakeEvent, SensorReading } from "./types.js";

let activeEvent: EarthquakeEvent | null = null;
let lastAboveThreshold = 0;
let peakDuringEvent = 0;

function rowToEvent(r: any): EarthquakeEvent {
  return {
    id: r.id,
    detectedAt: new Date(r.detected_at).toISOString(),
    magnitude: Number(r.magnitude),
    peakG: Number(r.peak_g),
    active: r.active,
    clearedAt: r.cleared_at ? new Date(r.cleared_at).toISOString() : null,
  };
}

export async function loadActiveEvent() {
  const { rows } = await pool.query("SELECT * FROM earthquakes WHERE active = true ORDER BY detected_at DESC LIMIT 1");
  activeEvent = rows[0] ? rowToEvent(rows[0]) : null;
  if (activeEvent) hub.setEarthquakeActive(true);
}

export async function latestEvents(): Promise<EarthquakeEvent[]> {
  const { rows } = await pool.query("SELECT * FROM earthquakes ORDER BY detected_at DESC LIMIT 20");
  return rows.map(rowToEvent);
}

// Evaluate a fresh reading and open / update / clear an earthquake event.
export async function evaluateReading(r: SensorReading) {
  const now = Date.now();
  const overThreshold = r.peak >= config.eqThresholdG;

  if (overThreshold) {
    lastAboveThreshold = now;
    if (!activeEvent) {
      const { rows } = await pool.query(
        "INSERT INTO earthquakes (magnitude, peak_g, active) VALUES ($1, $2, true) RETURNING *",
        [r.magnitude, r.peak],
      );
      activeEvent = rowToEvent(rows[0]);
      peakDuringEvent = r.peak;
      hub.setEarthquakeActive(true);
      hub.broadcast({ type: "earthquake", data: activeEvent });
      await hub.log("err", `EARTHQUAKE DETECTED — magnitude ${r.magnitude.toFixed(1)}, peak ${r.peak.toFixed(3)}g`);
      await resetPendingStudents();
    } else if (r.peak > peakDuringEvent) {
      // Update the running peak/magnitude of the ongoing event.
      peakDuringEvent = r.peak;
      const { rows } = await pool.query(
        "UPDATE earthquakes SET peak_g = $1, magnitude = GREATEST(magnitude, $2) WHERE id = $3 RETURNING *",
        [r.peak, r.magnitude, activeEvent.id],
      );
      activeEvent = rowToEvent(rows[0]);
      hub.broadcast({ type: "earthquake", data: activeEvent });
    }
  } else if (activeEvent) {
    // Auto-clear after a sustained calm period.
    if (now - lastAboveThreshold > config.eqClearSeconds * 1000) {
      await clearActiveEvent();
    }
  }
}

// Reset every student to "missing" so the safe-zone camera / QR can re-account
// for them during evacuation.
async function resetPendingStudents() {
  await pool.query("UPDATE students SET status = 'missing', method = '-', checked_in_at = NULL");
  const { rows } = await pool.query("SELECT * FROM students ORDER BY name ASC");
  const { rowToStudent } = await import("./db.js");
  hub.broadcast({ type: "students", data: rows.map(rowToStudent) });
}

export async function clearActiveEvent() {
  if (!activeEvent) return;
  const { rows } = await pool.query(
    "UPDATE earthquakes SET active = false, cleared_at = NOW() WHERE id = $1 RETURNING *",
    [activeEvent.id],
  );
  const cleared = rowToEvent(rows[0]);
  activeEvent = null;
  peakDuringEvent = 0;
  hub.setEarthquakeActive(false);
  hub.broadcast({ type: "earthquake", data: cleared });
  await hub.log("info", "Earthquake event cleared — situation stabilized.");
}

export function getActiveEvent() {
  return activeEvent;
}
