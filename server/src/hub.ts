import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { pool } from "./db.js";
import type { LogEntry, LogLevel, ServerMessage, SystemStatus } from "./types.js";

// Central broadcast hub: fans server events out to every connected dashboard,
// and tracks live hardware/service status.
class Hub {
  private wss: WebSocketServer | null = null;
  private status: SystemStatus = {
    sensorOnline: false,
    cameraOnline: false,
    faceServiceOnline: false,
    earthquakeActive: false,
    lastReadingAt: null,
  };
  private sensorTimer: ReturnType<typeof setTimeout> | null = null;
  private faceTimer: ReturnType<typeof setTimeout> | null = null;

  attach(server: Server) {
    this.wss = new WebSocketServer({ server, path: "/ws" });
    this.wss.on("connection", (ws) => {
      // Send the current status immediately on connect.
      ws.send(JSON.stringify({ type: "status", data: this.status } satisfies ServerMessage));
    });
  }

  broadcast(msg: ServerMessage) {
    const payload = JSON.stringify(msg);
    this.wss?.clients.forEach((c) => {
      if (c.readyState === WebSocket.OPEN) c.send(payload);
    });
  }

  getStatus(): SystemStatus {
    return this.status;
  }

  private pushStatus() {
    this.broadcast({ type: "status", data: this.status });
  }

  patchStatus(patch: Partial<SystemStatus>) {
    this.status = { ...this.status, ...patch };
    this.pushStatus();
  }

  // Called on every sensor reading; flips sensor offline if readings stop.
  markSensorAlive(ts: string) {
    const wasOnline = this.status.sensorOnline;
    this.status.sensorOnline = true;
    this.status.lastReadingAt = ts;
    if (!wasOnline) this.pushStatus();
    if (this.sensorTimer) clearTimeout(this.sensorTimer);
    this.sensorTimer = setTimeout(() => {
      this.status.sensorOnline = false;
      this.pushStatus();
    }, 3000); // sensor posts every ~500ms; 3s silence = offline
  }

  // Called by the face-service heartbeat / recognition posts.
  markFaceAlive(cameraOnline: boolean) {
    this.status.faceServiceOnline = true;
    this.status.cameraOnline = cameraOnline;
    this.pushStatus();
    if (this.faceTimer) clearTimeout(this.faceTimer);
    this.faceTimer = setTimeout(() => {
      this.status.faceServiceOnline = false;
      this.status.cameraOnline = false;
      this.pushStatus();
    }, 10000);
  }

  setEarthquakeActive(active: boolean) {
    this.status.earthquakeActive = active;
    this.pushStatus();
  }

  // Persist a log line and broadcast it.
  async log(level: LogLevel, message: string): Promise<LogEntry> {
    const { rows } = await pool.query(
      "INSERT INTO event_log (level, message) VALUES ($1, $2) RETURNING id, level, message, ts",
      [level, message],
    );
    const entry: LogEntry = {
      id: rows[0].id,
      level: rows[0].level,
      message: rows[0].message,
      ts: new Date(rows[0].ts).toISOString(),
    };
    this.broadcast({ type: "log", data: entry });
    return entry;
  }
}

export const hub = new Hub();
