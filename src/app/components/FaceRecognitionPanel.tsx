import { useState } from "react";
import { Panel } from "./Panel";
import { FACE_STREAM_URL } from "../lib/config";
import type { Student } from "../lib/types";

interface FaceRecognitionPanelProps {
  cameraOnline: boolean;
  faceServiceOnline: boolean;
  lastRecognized: Student | null;
}

const ZONES = ["Zone A (Bldg 1)", "Zone B (Bldg 2)", "Zone C (Gym)", "Zone D (Library)", "Zone E (Admin)"];

// Displays the safe-zone camera feed served by the Python face-service and the
// most recent auto-recognition. Recognition itself happens server-side; this
// panel only renders live results pushed over the WebSocket.
export function FaceRecognitionPanel({ cameraOnline, faceServiceOnline, lastRecognized }: FaceRecognitionPanelProps) {
  const [streamOn, setStreamOn] = useState(false);
  const active = streamOn && faceServiceOnline;

  return (
    <Panel
      title="Face Recognition"
      right={
        <span className="font-mono-seers" style={{ fontSize: 10, color: faceServiceOnline ? "var(--seers-green)" : "var(--seers-gray)" }}>
          {faceServiceOnline ? "ONLINE" : "OFFLINE"}
        </span>
      }
      bodyClassName="p-3"
    >
      <div className="relative">
        {active ? (
          <img
            src={FACE_STREAM_URL}
            alt="Safe-zone camera live feed"
            className="block max-h-[200px] w-full rounded-lg object-cover"
            style={{ background: "#0f172a" }}
          />
        ) : (
          <div
            className="rounded-lg border-2 border-dashed p-6 text-center"
            style={{ background: "#f1f5f9", borderColor: "#cbd5e1" }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
            <div className="font-mono-seers" style={{ fontSize: 11, color: "var(--seers-gray)" }}>
              {faceServiceOnline ? (
                <>Face service online.<br />Click below to view the live feed.</>
              ) : (
                <>Face service offline.<br />Start /face-service on the safe-zone PC.</>
              )}
            </div>
          </div>
        )}

        <button
          onClick={() => setStreamOn((v) => !v)}
          disabled={!faceServiceOnline}
          className="font-head-seers mt-2 w-full rounded-md py-2 uppercase tracking-[1px] text-white transition disabled:opacity-40"
          style={{ background: active ? "var(--seers-red)" : "var(--seers-green)", fontSize: 11, fontWeight: 700 }}
        >
          {active ? "✕ Hide Live Feed" : "📷 Show Live Feed"}
        </button>

        {lastRecognized && (
          <div
            className="seers-fade-in mt-2 rounded-md border px-3 py-2"
            style={{ background: "#dcfce7", borderColor: "#86efac" }}
          >
            <span className="font-mono-seers" style={{ fontSize: 12, color: "#15803d" }}>
              ✔ Recognized: {lastRecognized.name} ({lastRecognized.id}) — marked SAFE
            </span>
          </div>
        )}

        <div className="font-mono-seers mt-2" style={{ fontSize: 11, color: "var(--seers-gray)" }}>
          Camera: {cameraOnline ? "capturing" : "no signal"}
        </div>
      </div>

      <div className="mt-3">
        <div className="font-mono-seers mb-1.5 tracking-[1px]" style={{ fontSize: 10, color: "var(--seers-gray)" }}>SAFE ZONES</div>
        <div className="flex flex-wrap gap-2">
          {ZONES.map((z) => (
            <div
              key={z}
              className="font-mono-seers flex items-center gap-1.5 rounded px-3 py-1"
              style={{ background: "#dcfce7", color: "#15803d", border: "1px solid #86efac", fontSize: 11 }}
            >
              ● {z}
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}
