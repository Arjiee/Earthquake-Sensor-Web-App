import { Router } from "express";
import { requireAuth } from "../auth.js";
import { pool } from "../db.js";
import { hub } from "../hub.js";
import { clearActiveEvent, latestEvents } from "../earthquake.js";
import type { LogEntry } from "../types.js";

export const systemRouter = Router();

systemRouter.get("/status", requireAuth, (_req, res) => {
  res.json(hub.getStatus());
});

systemRouter.get("/logs", requireAuth, async (_req, res) => {
  const { rows } = await pool.query("SELECT id, level, message, ts FROM event_log ORDER BY ts DESC LIMIT 200");
  const logs: LogEntry[] = rows.map((r) => ({
    id: r.id,
    level: r.level,
    message: r.message,
    ts: new Date(r.ts).toISOString(),
  }));
  res.json(logs);
});

systemRouter.get("/earthquakes", requireAuth, async (_req, res) => {
  res.json(await latestEvents());
});

// Manually clear the active earthquake event (admin "Reset Event").
systemRouter.post("/earthquakes/reset", requireAuth, async (_req, res) => {
  await clearActiveEvent();
  await hub.log("info", "Event manually reset by admin.");
  res.status(204).end();
});
