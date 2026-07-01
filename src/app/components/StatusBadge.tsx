import type { StudentStatus } from "../lib/types";

const STYLES: Record<StudentStatus, { bg: string; color: string; border: string; blink?: boolean }> = {
  safe: { bg: "#dcfce7", color: "#15803d", border: "#86efac" },
  missing: { bg: "#fee2e2", color: "#dc2626", border: "#fca5a5", blink: true },
  pending: { bg: "#f1f5f9", color: "#64748b", border: "#cbd5e1" },
  evacuated: { bg: "#ffedd5", color: "#ea6c00", border: "#fdba74" },
};

export function StatusBadge({ status }: { status: StudentStatus }) {
  const s = STYLES[status];
  return (
    <span
      className={`font-mono-seers inline-block rounded px-2.5 py-0.5 uppercase tracking-[1px] ${s.blink ? "seers-blink" : ""}`}
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, fontSize: 10, fontWeight: 700 }}
    >
      {status}
    </span>
  );
}
