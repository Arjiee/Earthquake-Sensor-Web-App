import { Panel } from "./Panel";
import type { EarthquakeEvent, Student } from "../lib/types";

interface EvacuationSummaryProps {
  students: Student[];
  earthquake: EarthquakeEvent | null;
  alertsSent: number;
}

// Evacuation completion ring + response metrics + missing list.
export function EvacuationSummary({ students, earthquake, alertsSent }: EvacuationSummaryProps) {
  const total = students.length || 1;
  const safe = students.filter((s) => s.status === "safe").length;
  const pct = Math.round((safe / total) * 100);
  const circumference = 2 * Math.PI * 52;
  const offset = circumference - (pct / 100) * circumference;

  const missing = students.filter((s) => s.status === "missing" || s.status === "pending");

  const elapsed = earthquake
    ? Math.max(0, Math.floor((Date.now() - new Date(earthquake.detectedAt).getTime()) / 1000))
    : 0;
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  const metric = (label: string, value: string, color: string) => (
    <div className="rounded-md border p-2.5 text-center" style={{ background: "#f8fafc", borderColor: "#e2e8f0" }}>
      <div className="font-mono-seers" style={{ fontSize: 10, color: "var(--seers-gray)" }}>{label}</div>
      <div className="font-head-seers" style={{ fontSize: 20, fontWeight: 900, color }}>{value}</div>
    </div>
  );

  return (
    <Panel title="Evacuation Summary">
      <div className="relative mx-auto mb-4 flex h-[110px] w-[110px] items-center justify-center">
        <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="60" cy="60" r="52" fill="none" stroke="#e2e8f0" strokeWidth="10" />
          <circle
            cx="60" cy="60" r="52" fill="none" stroke="var(--seers-teal)" strokeWidth="10"
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1s ease" }}
          />
        </svg>
        <div className="relative z-[1] text-center">
          <div style={{ fontSize: 26, fontWeight: 900, color: "var(--seers-teal)" }}>{pct}%</div>
          <div className="font-mono-seers" style={{ fontSize: 10, color: "var(--seers-gray)" }}>accounted</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {metric("RESPONSE TIME", earthquake?.active ? `${mm}:${ss}` : "00:00", "var(--seers-yellow)")}
        {metric("ACCOUNTED", `${safe}/${students.length}`, "var(--seers-teal)")}
        {metric("EARTHQUAKE MAG", earthquake ? earthquake.magnitude.toFixed(1) : "—", "var(--seers-red)")}
        {metric("ALERTS SENT", String(alertsSent), "var(--seers-orange)")}
      </div>

      <div className="mt-2.5">
        <div className="font-mono-seers mb-1.5" style={{ fontSize: 10, color: "var(--seers-gray)" }}>MISSING / UNACCOUNTED</div>
        <div className="font-mono-seers leading-[1.8]" style={{ fontSize: 12, color: "var(--seers-red)" }}>
          {missing.length === 0
            ? "— all students accounted for"
            : missing.map((m) => `${m.id}  ${m.name}`).join("\n")}
        </div>
      </div>
    </Panel>
  );
}
