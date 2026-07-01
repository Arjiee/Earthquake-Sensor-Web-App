import { useEffect, useRef } from "react";
import type { SensorReading } from "../lib/types";
import { magnitudeTone, mmiFromPeakG } from "../lib/seismic";

interface SeismicBarProps {
  reading: SensorReading;
  waveform: number[];
  sensorOnline: boolean;
}

// Live seismograph strip + axis readouts + magnitude, fed by the MPU6050.
export function SeismicBar({ reading, waveform, sensorOnline }: SeismicBarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mmi = mmiFromPeakG(reading.peak);
  const tone = magnitudeTone(reading.magnitude);

  // Redraw the rolling waveform whenever it changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = (canvas.width = canvas.offsetWidth);
    const h = (canvas.height = 56);
    ctx.clearRect(0, 0, w, h);

    // baseline
    ctx.strokeStyle = "#e2e8f0";
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    if (waveform.length < 2) return;
    const step = w / (waveform.length - 1);
    const scale = 90; // amplify small g-values for visibility
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = tone === "alert" ? "#dc2626" : "#2563eb";
    ctx.beginPath();
    waveform.forEach((v, i) => {
      const y = h / 2 - v * scale;
      const yc = Math.max(2, Math.min(h - 2, y));
      if (i === 0) ctx.moveTo(0, yc);
      else ctx.lineTo(i * step, yc);
    });
    ctx.stroke();
  }, [waveform, tone]);

  const levelClass = (i: number) => {
    if (i >= mmi.level) return "bg-slate-200";
    if (mmi.level <= 3) return "bg-[var(--seers-green)]";
    if (mmi.level <= 6) return "bg-[var(--seers-yellow)]";
    return "bg-[var(--seers-red)]";
  };

  return (
    <div
      className="mb-5 flex flex-wrap items-center gap-5 rounded-lg border bg-white p-4"
      style={{ borderColor: "#e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,.07)" }}
    >
      <div className="min-w-[160px]">
        <div className="font-mono-seers" style={{ fontSize: 11, color: "var(--seers-gray)" }}>⚡ SEISMIC MONITOR</div>
        <div className="font-body-seers" style={{ fontSize: 11, color: "var(--seers-gray)" }}>
          MMI: {mmi.roman} — {mmi.label}
        </div>
        <div className="mt-2 flex gap-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={`h-5 flex-1 rounded-[3px] transition-colors ${levelClass(i)}`} />
          ))}
        </div>
      </div>

      <div className="relative h-14 min-w-[220px] flex-1 overflow-hidden rounded bg-slate-100">
        <canvas ref={canvasRef} className="h-14 w-full" />
      </div>

      <div className="flex min-w-[140px] flex-col gap-1">
        <Axis label="X-axis" value={reading.x} color="#e53e3e" />
        <Axis label="Y-axis" value={reading.y} color="#38a169" />
        <Axis label="Z-axis" value={reading.z} color="var(--seers-teal)" />
        <div className="mt-1 border-t pt-1" style={{ borderColor: "#e2e8f0" }}>
          <Axis label="Peak" value={reading.peak} color="var(--seers-orange)" />
        </div>
      </div>

      <div className="text-right">
        <div className="font-mono-seers" style={{ fontSize: 11, color: "var(--seers-gray)" }}>
          Source: {sensorOnline ? reading.deviceId : "— (offline)"}
        </div>
        <div
          className={`font-mono-seers ${tone === "alert" ? "seers-blink" : ""}`}
          style={{ fontSize: 26, color: tone === "alert" ? "var(--seers-red)" : "var(--seers-green)" }}
        >
          {reading.magnitude.toFixed(1)}
        </div>
        <div className="font-body-seers" style={{ fontSize: 11, color: "var(--seers-gray)" }}>Richter Scale</div>
      </div>
    </div>
  );
}

function Axis({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="font-mono-seers flex justify-between gap-2" style={{ fontSize: 11 }}>
      <span style={{ color: "var(--seers-gray)" }}>{label}</span>
      <span style={{ color }}>{value.toFixed(3)} g</span>
    </div>
  );
}
