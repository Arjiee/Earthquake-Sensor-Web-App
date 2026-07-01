import { useMemo, useState } from "react";
import type { Student } from "../lib/types";
import { StatusBadge } from "./StatusBadge";
import { Panel } from "./Panel";

interface StudentTableProps {
  students: Student[];
  onMarkSafe: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (student: Student) => void;
  onEnroll: (student: Student) => void;
  scanRate: number;
}

const METHOD_LABEL: Record<string, string> = { face: "FACE", qr: "QR", manual: "MANUAL", "-": "—" };

// Live student headcount table with search + per-row actions.
export function StudentTable({ students, onMarkSafe, onDelete, onEdit, onEnroll, scanRate }: StudentTableProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q) || s.yearSection.toLowerCase().includes(q),
    );
  }, [students, query]);

  return (
    <Panel
      title="Student Headcount"
      right={<span className="font-mono-seers" style={{ fontSize: 11, color: "var(--seers-gray)" }}>Scan rate: {scanRate}/min</span>}
      bodyClassName="p-3"
    >
      <input
        className="font-mono-seers mb-3 w-full rounded-md border bg-slate-50 px-3.5 py-[7px] outline-none focus:border-[var(--seers-teal)]"
        style={{ borderColor: "#e2e8f0", color: "var(--seers-ink)", fontSize: 12 }}
        placeholder="Search name, ID, or section — or scan a QR ID here…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="max-h-[340px] overflow-y-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {["ID", "Student Name", "Year / Sec", "Method", "Status", "Time", "Actions"].map((h) => (
                <th
                  key={h}
                  className="font-mono-seers border-b-[1.5px] px-2.5 py-2 text-left uppercase tracking-[1px]"
                  style={{ borderColor: "#e2e8f0", fontSize: 10, color: "var(--seers-gray)" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="font-mono-seers py-8 text-center" style={{ color: "var(--seers-gray)", fontSize: 12 }}>
                  {students.length === 0 ? "No students enrolled yet." : "No matches."}
                </td>
              </tr>
            )}
            {filtered.map((s) => (
              <tr key={s.id} className="seers-fade-in border-b transition-colors hover:bg-[#f0f6ff]" style={{ borderColor: "#f1f5f9" }}>
                <td className="font-mono-seers px-2.5 py-2" style={{ fontSize: 12 }}>{s.id}</td>
                <td className="font-body-seers px-2.5 py-2" style={{ fontSize: 13 }}>
                  {s.name}
                  {!s.hasFace && (
                    <span className="font-mono-seers ml-1.5" style={{ fontSize: 9, color: "var(--seers-yellow)" }}>· no face</span>
                  )}
                </td>
                <td className="font-body-seers px-2.5 py-2" style={{ fontSize: 13 }}>{s.yearSection}</td>
                <td className="font-mono-seers px-2.5 py-2" style={{ fontSize: 11, color: "var(--seers-gray)" }}>{METHOD_LABEL[s.method] ?? "—"}</td>
                <td className="px-2.5 py-2"><StatusBadge status={s.status} /></td>
                <td className="font-mono-seers px-2.5 py-2" style={{ fontSize: 11, color: "var(--seers-gray)" }}>
                  {s.checkedInAt ? new Date(s.checkedInAt).toLocaleTimeString("en-GB") : "—"}
                </td>
                <td className="px-2.5 py-2">
                  <div className="flex flex-wrap gap-1.5">
                    {s.status !== "safe" && (
                      <button
                        onClick={() => onMarkSafe(s.id)}
                        className="font-head-seers rounded px-2.5 py-1 uppercase tracking-[1px] text-white"
                        style={{ background: "var(--seers-green)", fontSize: 10, fontWeight: 700 }}
                      >
                        Safe
                      </button>
                    )}
                    <button
                      onClick={() => onEnroll(s)}
                      className="font-head-seers rounded px-2.5 py-1 uppercase tracking-[1px] text-white"
                      style={{ background: s.hasFace ? "var(--seers-gray)" : "var(--seers-orange)", fontSize: 10, fontWeight: 700 }}
                      title={s.hasFace ? "Re-enroll / manage face" : "Enroll face"}
                    >
                      {s.hasFace ? "Face ✓" : "Enroll"}
                    </button>
                    <button
                      onClick={() => onEdit(s)}
                      className="font-head-seers rounded border px-2.5 py-1 uppercase tracking-[1px]"
                      style={{ borderColor: "var(--seers-teal)", color: "var(--seers-teal)", fontSize: 10, fontWeight: 700 }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(s.id)}
                      className="font-head-seers rounded border px-2.5 py-1 uppercase tracking-[1px]"
                      style={{ borderColor: "#e2e8f0", color: "var(--seers-gray)", fontSize: 10, fontWeight: 700 }}
                    >
                      Del
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
