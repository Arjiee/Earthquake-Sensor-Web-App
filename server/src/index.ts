import http from "http";
import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { hub } from "./hub.js";
import { pool } from "./db.js";
import { authRouter } from "./auth.js";
import { studentsRouter } from "./routes/students.js";
import { ingestRouter } from "./routes/ingest.js";
import { systemRouter } from "./routes/system.js";
import { loadActiveEvent } from "./earthquake.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRouter);
app.use("/api/students", studentsRouter);
app.use("/api", systemRouter);
app.use("/ingest", ingestRouter);

// Fallback error handler so route throws return JSON, not HTML.
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err?.message ?? "Internal error" });
});

const server = http.createServer(app);
hub.attach(server);

async function start() {
  await pool.query("SELECT 1"); // fail fast if DB is unreachable
  await loadActiveEvent();
  server.listen(config.port, () => {
    console.log(`SEERS server listening on http://localhost:${config.port}`);
    console.log(`WebSocket:  ws://localhost:${config.port}/ws`);
    hub.log("info", "SEERS server started.").catch(() => {});
  });
}

start().catch((err) => {
  console.error("Failed to start SEERS server:", err.message);
  console.error("Is PostgreSQL running and DATABASE_URL correct? Did you run the schema + seed?");
  process.exit(1);
});
