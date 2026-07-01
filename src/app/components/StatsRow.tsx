import type { Student } from "../lib/types";

// Four headline counters derived from the current student roster.
export function StatsRow({ students }: { students: Student[] }) {
  const total = students.length;
  const evacuated = students.filter((s) => s.status === "evacuated" || s.status === "safe").length;
  const safe = students.filter((s) => s.status === "safe").length;
  const missing = students.filter((s) => s.status === "missing" || s.status === "pending").length;

  const cards = [
    { label: "Total Enrolled", value: total, sub: "Students registered", accent: "var(--seers-orange)" },
    { label: "Evacuated", value: evacuated, sub: "At assembly point", accent: "var(--seers-teal)" },
    { label: "Accounted", value: safe, sub: "Face / QR verified", accent: "var(--seers-green)" },
    { label: "Missing / Unaccounted", value: missing, sub: "Require search & rescue", accent: "var(--seers-red)" },
  ];

  return (
    <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="relative overflow-hidden rounded-[10px] border bg-white p-[18px]"
          style={{ borderColor: "#e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,.06)" }}
        >
          <div className="absolute left-0 right-0 top-0 h-1" style={{ background: c.accent }} />
          <div className="font-mono-seers uppercase tracking-[2px]" style={{ fontSize: 10, color: "var(--seers-gray)" }}>{c.label}</div>
          <div className="font-head-seers" style={{ fontSize: 40, fontWeight: 900, lineHeight: 1, margin: "8px 0 4px", color: c.accent }}>{c.value}</div>
          <div className="font-mono-seers" style={{ fontSize: 11, color: "var(--seers-gray)" }}>{c.sub}</div>
        </div>
      ))}
    </div>
  );
}
