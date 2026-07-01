import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useSeers } from "../lib/useSeers";
import { Topbar } from "./Topbar";
import { AlertBanner } from "./AlertBanner";
import { SeismicBar } from "./SeismicBar";
import { StatsRow } from "./StatsRow";
import { StudentTable } from "./StudentTable";
import { QrScannerPanel } from "./QrScannerPanel";
import { FaceRecognitionPanel } from "./FaceRecognitionPanel";
import { EventLog } from "./EventLog";
import { EvacuationSummary } from "./EvacuationSummary";
import { AddStudentModal } from "./AddStudentModal";
import { EnrollFaceModal } from "./EnrollFaceModal";
import { QrGeneratorModal } from "./QrGeneratorModal";
import type { AdminUser, Student } from "../lib/types";

interface DashboardProps {
  user: AdminUser | null;
  onLogout: () => void;
}

export function Dashboard({ user, onLogout }: DashboardProps) {
  const seers = useSeers(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [enrolling, setEnrolling] = useState<Student | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [scanCount, setScanCount] = useState(0);
  const [lastScanId, setLastScanId] = useState("");
  const [scanTimes, setScanTimes] = useState<number[]>([]);

  const earthquakeActive = seers.earthquake?.active ?? seers.status.earthquakeActive;

  // Body shake + alert toast when a new earthquake fires.
  const prevEqId = useRef<number | null>(null);
  useEffect(() => {
    const eq = seers.earthquake;
    if (eq && eq.active && eq.id !== prevEqId.current) {
      prevEqId.current = eq.id;
      document.body.classList.add("seers-shaking");
      setTimeout(() => document.body.classList.remove("seers-shaking"), 2500);
      toast.error(`Earthquake detected — Magnitude ${eq.magnitude.toFixed(1)}`);
    }
  }, [seers.earthquake]);

  const handleScan = useCallback(
    async (id: string) => {
      setLastScanId(id);
      try {
        await seers.markSafe(id, "qr");
        setScanCount((c) => c + 1);
        setScanTimes((t) => [...t, Date.now()]);
        toast.success(`${id} checked in`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : `Unknown ID: ${id}`);
      }
    },
    [seers],
  );

  const scanRate = useMemo(() => {
    const cutoff = Date.now() - 60_000;
    return scanTimes.filter((t) => t > cutoff).length;
  }, [scanTimes]);

  const lastRecognized = useMemo(() => {
    const faces = seers.students
      .filter((s) => s.method === "face" && s.checkedInAt)
      .sort((a, b) => new Date(b.checkedInAt!).getTime() - new Date(a.checkedInAt!).getTime());
    return faces[0] ?? null;
  }, [seers.students]);

  const alertsSent = seers.logs.filter((l) => l.level === "err" || l.level === "warn").length;

  return (
    <div className="seers-grid-bg min-h-screen" style={{ background: "var(--seers-navy)", color: "var(--seers-ink)" }}>
      <AlertBanner show={earthquakeActive} />
      <Topbar status={{ ...seers.status, earthquakeActive }} connected={seers.connected} user={user} onLogout={onLogout} />

      <div className="relative z-[1] mx-auto max-w-[1500px] p-5">
        <SeismicBar reading={seers.reading} waveform={seers.waveform} sensorOnline={seers.status.sensorOnline} />

        {/* Controls */}
        <div className="mb-5 flex flex-wrap items-center gap-2.5">
          <button onClick={() => setShowQr(true)} className="font-head-seers rounded-md px-5 py-2.5 uppercase tracking-[1.5px] text-white" style={{ background: "var(--seers-orange)", fontSize: 12, fontWeight: 700 }}>🔲 QR Code Generator</button>
          <button onClick={() => { setEditing(null); setShowAdd(true); }} className="font-head-seers rounded-md border px-5 py-2.5 uppercase tracking-[1.5px]" style={{ borderColor: "var(--seers-teal)", color: "var(--seers-teal)", fontSize: 12, fontWeight: 700 }}>+ Add Student</button>
          <button
            onClick={() => seers.resetEvent().then(() => toast("Event reset")).catch(() => toast.error("Reset failed"))}
            className="font-head-seers rounded-md border px-5 py-2.5 uppercase tracking-[1.5px]"
            style={{ borderColor: "var(--seers-teal)", color: "var(--seers-teal)", fontSize: 12, fontWeight: 700 }}
          >
            ↺ Reset Event
          </button>
          <span className="font-mono-seers ml-auto self-center" style={{ fontSize: 12, color: "var(--seers-gray)" }}>
            PHASE: {earthquakeActive ? "EVACUATION" : seers.connected ? "MONITORING" : "OFFLINE"}
          </span>
        </div>

        <StatsRow students={seers.students} />

        <div className="mb-5 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <StudentTable
            students={seers.students}
            onMarkSafe={(id) => handleScan(id)}
            onDelete={(id) => seers.deleteStudent(id).catch(() => toast.error("Delete failed"))}
            onEdit={(s) => { setEditing(s); setShowAdd(true); }}
            onEnroll={(s) => setEnrolling(s)}
            scanRate={scanRate}
          />
          <div className="flex flex-col gap-4">
            <QrScannerPanel students={seers.students} scanCount={scanCount} lastScanId={lastScanId} onScan={handleScan} />
            <FaceRecognitionPanel cameraOnline={seers.status.cameraOnline} faceServiceOnline={seers.status.faceServiceOnline} lastRecognized={lastRecognized} />
          </div>
        </div>

        <div className="mb-5 grid gap-5 lg:grid-cols-2">
          <EventLog logs={seers.logs} />
          <EvacuationSummary students={seers.students} earthquake={seers.earthquake} alertsSent={alertsSent} />
        </div>
      </div>

      <AddStudentModal
        open={showAdd}
        editing={editing}
        onClose={() => { setShowAdd(false); setEditing(null); }}
        onSubmit={seers.addStudent}
        onUpdate={seers.updateStudent}
      />
      <EnrollFaceModal
        student={enrolling}
        onClose={() => setEnrolling(null)}
        onEnroll={seers.enrollFace}
        onClear={seers.clearFace}
      />
      <QrGeneratorModal open={showQr} onClose={() => setShowQr(false)} students={seers.students} />
    </div>
  );
}
