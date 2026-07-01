import { Panel } from "./Panel";
import type { LogEntry } from "../lib/types";

const COLORS: Record<string, string> = {
  ok: "var(--seers-green)",
  warn: "var(--seers-yellow)",
  err: "var(--seers-red)",
  info: "var(--seers-teal)",
};

// Streaming system event feed pushed from the backend.
export function EventLog({ logs }: { logs: LogEntry[] }) {
  return (
    <Panel title="System Event Log" bodyClassName="px-4 py-3">
      <div className="font-mono-seers h-[260px] overflow-y-auto leading-[1.8]" style={{ fontSize: 11 }}>
        {logs.length === 0 && <div style={{ color: "var(--seers-gray)" }}>No events yet. Waiting for the backend…</div>}
        {logs.map((l) => (
          <div key={l.id} className="seers-fade-in border-b py-1" style={{ borderColor: "#f1f5f9" }}>
            <span style={{ color: "var(--seers-gray)", marginRight: 10 }}>{new Date(l.ts).toLocaleTimeString("en-GB")}</span>
            <span style={{ color: COLORS[l.level] ?? "var(--seers-ink)" }}>{l.message}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
