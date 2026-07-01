import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import type { Student } from "../lib/types";

interface QrGeneratorModalProps {
  open: boolean;
  onClose: () => void;
  students: Student[];
}

// Renders a printable QR card for every student. The QR payload is the raw
// student ID, which the QR scanner panel reads to check students in.
export function QrGeneratorModal({ open, onClose, students }: QrGeneratorModalProps) {
  const [query, setQuery] = useState("");
  const [codes, setCodes] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q));
  }, [students, query]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        filtered.map(async (s) => [s.id, await QRCode.toDataURL(s.id, { width: 200, margin: 1 })] as const),
      );
      if (!cancelled) setCodes(Object.fromEntries(entries));
    })();
    return () => { cancelled = true; };
  }, [open, filtered]);

  if (!open) return null;

  const printOne = (s: Student) => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>${s.id}</title></head><body style="text-align:center;font-family:sans-serif;padding:40px">
      <img src="${codes[s.id]}" style="width:280px"/><h2>${s.name}</h2><p>${s.id} — ${s.yearSection}</p>
      <script>window.print()</script></body></html>`);
    w.document.close();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: "rgba(0,0,0,.5)" }}>
      <div className="seers-fade-in max-h-[90vh] w-[95%] max-w-[800px] overflow-y-auto rounded-xl border bg-white p-7" style={{ borderColor: "#e2e8f0", boxShadow: "0 8px 32px rgba(0,0,0,.15)" }}>
        <div className="font-head-seers mb-1" style={{ fontSize: 20, fontWeight: 900, color: "var(--seers-teal)" }}>🔲 Student QR Codes</div>
        <div className="font-mono-seers mb-3" style={{ fontSize: 11, color: "var(--seers-gray)" }}>Click any card to print that student's QR code.</div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter students…"
          className="font-body-seers mb-3 w-full rounded-md border bg-slate-50 px-3.5 py-2.5 outline-none focus:border-[var(--seers-teal)]"
          style={{ borderColor: "#e2e8f0", color: "var(--seers-ink)", fontSize: 13 }}
        />
        <div className="grid max-h-[420px] gap-3 overflow-y-auto p-1" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))" }}>
          {filtered.map((s) => (
            <button
              key={s.id}
              onClick={() => printOne(s)}
              className="rounded-lg border p-3 text-center transition hover:border-[var(--seers-teal)] hover:bg-[#eff6ff]"
              style={{ background: "#f8fafc", borderColor: "#e2e8f0" }}
            >
              {codes[s.id] ? <img src={codes[s.id]} alt={s.id} className="mx-auto w-full" /> : <div className="h-[120px]" />}
              <div className="font-body-seers mt-2" style={{ fontSize: 11, fontWeight: 600, color: "var(--seers-ink)" }}>{s.name}</div>
              <div className="font-mono-seers" style={{ fontSize: 10, color: "var(--seers-gray)" }}>{s.id}</div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="font-mono-seers col-span-full py-8 text-center" style={{ fontSize: 12, color: "var(--seers-gray)" }}>No students.</div>
          )}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="font-head-seers rounded-md border px-5 py-2.5 uppercase tracking-[1.5px]" style={{ borderColor: "var(--seers-teal)", color: "var(--seers-teal)", fontSize: 12, fontWeight: 700 }}>Close</button>
        </div>
      </div>
    </div>
  );
}
