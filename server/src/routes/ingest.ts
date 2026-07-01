import { Router } from "express";
import { requireDevice } from "../auth.js";
import { hub } from "../hub.js";
import { markStudentSafe } from "../db.js";
import { evaluateReading } from "../earthquake.js";
import type { SensorReading } from "../types.js";

export const ingestRouter = Router();

// Compute a rough Richter-style magnitude from peak ground acceleration (g).
// Not a scientific instrument — a monotonic estimate for the dashboard.
function estimateMagnitude(peakG: number): number {
  if (peakG <= 0.001) return 0;
  const m = 2.0 + 2.2 * Math.log10(peakG * 1000);
  return Math.max(0, Math.min(9.9, Number(m.toFixed(1))));
}

// --- ESP8266 (MPU6050) posts a JSON reading every ~500ms ---
// Body: { deviceId, x, y, z }  (acceleration in g, including gravity on Z)
ingestRouter.post("/reading", requireDevice, async (req, res) => {
  const { deviceId, x, y, z } = req.body ?? {};
  if ([x, y, z].some((v) => typeof v !== "number")) {
    return res.status(400).json({ error: "x, y, z (numbers) required" });
  }
  // Deviation of the acceleration vector magnitude from rest (~1g).
  const vector = Math.sqrt(x * x + y * y + z * z);
  const peak = Math.abs(vector - 1);
  const reading: SensorReading = {
    x, y, z,
    peak: Number(peak.toFixed(4)),
    magnitude: estimateMagnitude(peak),
    timestamp: new Date().toISOString(),
    deviceId: deviceId ?? "esp8266",
  };
  hub.markSensorAlive(reading.timestamp);
  hub.broadcast({ type: "reading", data: reading });
  await evaluateReading(reading);
  res.json({ ok: true });
});

// --- Face-service posts a recognition when it spots a registered student ---
// Body: { studentId }
ingestRouter.post("/recognition", requireDevice, async (req, res) => {
  const { studentId } = req.body ?? {};
  if (!studentId) return res.status(400).json({ error: "studentId required" });
  const student = await markStudentSafe(studentId, "face");
  if (!student) return res.status(404).json({ error: "Unknown student" });
  hub.broadcast({ type: "student_update", data: student });
  await hub.log("ok", `Face recognized: ${student.name} (${student.id}) — auto-marked SAFE`);
  res.json({ ok: true, student });
});

// --- Face-service heartbeat (every few seconds) ---
// Body: { cameraOnline: boolean }
ingestRouter.post("/face/heartbeat", requireDevice, (req, res) => {
  hub.markFaceAlive(Boolean(req.body?.cameraOnline));
  res.json({ ok: true });
});
