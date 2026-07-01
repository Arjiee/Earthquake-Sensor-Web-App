import { useEffect, useState } from "react";
import type { Student } from "../lib/types";

interface AddStudentModalProps {
  open: boolean;
  editing: Student | null;   // when set, the modal is in "edit" mode
  onClose: () => void;
  onSubmit: (s: { id: string; name: string; yearSection: string }) => Promise<void>;
  onUpdate: (id: string, s: { name: string; yearSection: string }) => Promise<void>;
}

export function AddStudentModal({ open, editing, onClose, onSubmit, onUpdate }: AddStudentModalProps) {
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [yearSection, setYearSection] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const isEdit = editing !== null;

  // Prefill fields when entering edit mode / reset when opening for add.
  useEffect(() => {
    if (!open) return;
    setError("");
    if (editing) {
      setId(editing.id);
      setName(editing.name);
      setYearSection(editing.yearSection);
    } else {
      setId(""); setName(""); setYearSection("");
    }
  }, [open, editing]);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if ((!isEdit && !id.trim()) || !name.trim()) {
      setError("ID and name are required.");
      return;
    }
    setBusy(true);
    try {
      if (isEdit) {
        await onUpdate(editing!.id, { name: name.trim(), yearSection: yearSection.trim() });
      } else {
        await onSubmit({ id: id.trim(), name: name.trim(), yearSection: yearSection.trim() });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save student");
    } finally {
      setBusy(false);
    }
  };

  const label = (t: string) => (
    <label className="font-mono-seers mb-1 block uppercase tracking-[1px]" style={{ fontSize: 10, color: "var(--seers-gray)" }}>{t}</label>
  );
  const input = "font-body-seers mb-2.5 w-full rounded-md border bg-slate-50 px-3.5 py-2.5 outline-none focus:border-[var(--seers-teal)]";
  const inputStyle = { borderColor: "#e2e8f0", color: "var(--seers-ink)", fontSize: 13 } as const;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: "rgba(0,0,0,.5)" }}>
      <form onSubmit={submit} className="seers-fade-in w-[95%] max-w-[520px] rounded-xl border bg-white p-7" style={{ borderColor: "#e2e8f0", boxShadow: "0 8px 32px rgba(0,0,0,.15)" }}>
        <div className="font-head-seers mb-3" style={{ fontSize: 20, fontWeight: 900, color: "var(--seers-teal)" }}>
          {isEdit ? "✎ Edit Student" : "+ Add Student"}
        </div>
        {error && <div className="font-mono-seers mb-2.5" style={{ fontSize: 11, color: "var(--seers-red)" }}>{error}</div>}
        {label("ID Number")}
        <input className={input} style={inputStyle} value={id} onChange={(e) => setId(e.target.value)} placeholder="2021-XXXXX" disabled={isEdit} />
        {label("Full Name")}
        <input className={input} style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Last, First M." />
        {label("Year / Section")}
        <input className={input} style={inputStyle} value={yearSection} onChange={(e) => setYearSection(e.target.value)} placeholder="e.g. 3-A" />
        <div className="mt-2 flex justify-end gap-2.5">
          <button type="button" onClick={onClose} className="font-head-seers rounded-md border px-5 py-2.5 uppercase tracking-[1.5px]" style={{ borderColor: "var(--seers-teal)", color: "var(--seers-teal)", fontSize: 12, fontWeight: 700 }}>Cancel</button>
          <button type="submit" disabled={busy} className="font-head-seers rounded-md px-5 py-2.5 uppercase tracking-[1.5px] text-white disabled:opacity-50" style={{ background: "var(--seers-teal)", fontSize: 12, fontWeight: 700 }}>
            {busy ? "Saving…" : isEdit ? "Save Changes" : "Save Student"}
          </button>
        </div>
        {!isEdit && (
          <div className="font-mono-seers mt-3" style={{ fontSize: 10, color: "var(--seers-gray)" }}>
            After saving, use the “Enroll” action in the roster to capture the student's face.
          </div>
        )}
      </form>
    </div>
  );
}
