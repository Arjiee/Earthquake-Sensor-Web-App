import { useEffect, useState } from "react";
import type { AdminUser, SystemStatus } from "../lib/types";

interface TopbarProps {
  status: SystemStatus;
  connected: boolean;
  user: AdminUser | null;
  onLogout: () => void;
}

function Pill({ label, state }: { label: string; state: "on" | "off" | "err" }) {
  const dotColor = state === "on" ? "var(--seers-green)" : state === "err" ? "var(--seers-red)" : "var(--seers-gray)";
  return (
    <span
      className="hw-pill font-mono-seers flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-[5px]"
      style={{ fontSize: 11 }}
    >
      <span
        className={`h-2 w-2 rounded-full ${state === "on" ? "dot-pulse-green" : ""}`}
        style={{ background: dotColor }}
      />
      {label}
    </span>
  );
}

export function Topbar({ status, connected, user, onLogout }: TopbarProps) {
  const [clock, setClock] = useState("");
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString("en-GB"));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const alert = status.earthquakeActive;

  return (
    <div
      className="sticky top-0 z-[100] flex h-14 items-center justify-between border-b-2 px-6"
      style={{ background: "rgba(255,255,255,.97)", borderColor: "#dbeafe", backdropFilter: "blur(10px)", boxShadow: "0 1px 4px rgba(0,0,0,.08)" }}
    >
      <div className="font-head-seers tracking-[3px]" style={{ fontWeight: 900, fontSize: 20, color: "var(--seers-teal)" }}>
        SEERS <span style={{ color: "var(--seers-orange)" }}>|</span> ORCR
      </div>

      <div className="hidden items-center gap-3 lg:flex">
        <span className="font-mono-seers" style={{ fontSize: 12, color: "var(--seers-gray)" }}>Philsca — Pasay</span>
        <Pill label="SENSOR" state={status.sensorOnline ? "on" : "off"} />
        <Pill label="CAMERA" state={status.cameraOnline ? "on" : "off"} />
        <Pill label="FACE" state={status.faceServiceOnline ? "on" : "off"} />
        <Pill label="SERVER" state={connected ? "on" : "err"} />
      </div>

      <div className="flex items-center gap-3">
        <span
          className={`h-2.5 w-2.5 rounded-full ${alert ? "dot-pulse-red" : "dot-pulse-green"}`}
          style={{ background: alert ? "var(--seers-red)" : "var(--seers-green)" }}
        />
        <span className="font-mono-seers" style={{ fontSize: 12, color: "var(--seers-ink)" }}>
          {alert ? "EMERGENCY" : connected ? "MONITORING" : "OFFLINE"}
        </span>
        <span id="clock" className="font-mono-seers" style={{ fontSize: 13, color: "var(--seers-teal)" }}>{clock}</span>
        {user && (
          <span className="font-mono-seers hidden sm:inline" style={{ fontSize: 11, color: "var(--seers-gray)" }}>
            {user.username}
          </span>
        )}
        <button
          onClick={onLogout}
          className="font-mono-seers rounded border px-3 py-[5px]"
          style={{ borderColor: "var(--seers-red)", color: "var(--seers-red)", fontSize: 11, fontWeight: 600 }}
        >
          LOGOUT
        </button>
      </div>
    </div>
  );
}
