import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Student } from "../lib/types";

interface EnrollFaceModalProps {
  student: Student | null;      // null = closed
  onClose: () => void;
  onEnroll: (id: string, images: string[]) => Promise<number>;
  onClear: (id: string) => Promise<void>;
}

// Guided poses to encourage a few varied angles.
const POSES = ["Look straight ahead", "Turn slightly left", "Turn slightly right", "Tilt head up", "Neutral again"];

// Captures webcam shots in the browser and uploads them for face enrollment.
// The actual template extraction happens server-side in the Python face-service.
export function EnrollFaceModal({ student, onClose, onEnroll, onClear }: EnrollFaceModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [shots, setShots] = useState<string[]>([]);
  const [camReady, setCamReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  const open = student !== null;

  useEffect(() => {
    if (!open) return;
    setShots([]);
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCamReady(true);
      } catch {
        toast.error("Webcam unavailable — check browser permissions.");
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setCamReady(false);
    };
  }, [open]);

  if (!open || !student) return null;

  const capture = () => {
    const video = videoRef.current;
    if (!video || !camReady) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    setShots((s) => [...s, canvas.toDataURL("image/jpeg", 0.85)]);
  };

  const submit = async () => {
    if (shots.length === 0) {
      toast.error("Capture at least one shot.");
      return;
    }
    setBusy(true);
    try {
      const saved = await onEnroll(student.id, shots);
      toast.success(`Enrolled ${saved} face shot(s) for ${student.name}`);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Enrollment failed");
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    setBusy(true);
    try {
      await onClear(student.id);
      toast("Face enrollment cleared");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to clear enrollment");
    } finally {
      setBusy(false);
    }
  };

  const pose = POSES[Math.min(shots.length, POSES.length - 1)];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: "rgba(0,0,0,.5)" }}>
      <div className="seers-fade-in max-h-[90vh] w-[95%] max-w-[560px] overflow-y-auto rounded-xl border bg-white p-7" style={{ borderColor: "#e2e8f0", boxShadow: "0 8px 32px rgba(0,0,0,.15)" }}>
        <div className="font-head-seers mb-1" style={{ fontSize: 20, fontWeight: 900, color: "var(--seers-teal)" }}>
          📷 Enroll Face — {student.name}
        </div>
        <div className="font-mono-seers mb-3" style={{ fontSize: 11, color: "var(--seers-gray)" }}>
          Stand 1–2 m from the camera in good light. Capture a few shots from slightly different angles.
        </div>

        <div className="relative overflow-hidden rounded-lg" style={{ background: "#0b1220", aspectRatio: "16/9" }}>
          <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
          {!camReady && (
            <div className="font-mono-seers absolute inset-0 flex items-center justify-center" style={{ color: "#94a3b8", fontSize: 13 }}>
              Starting camera…
            </div>
          )}
        </div>

        <div className="font-head-seers mt-3 text-center" style={{ fontSize: 16, fontWeight: 700, color: "var(--seers-ink)" }}>{pose}</div>

        {shots.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {shots.map((s, i) => (
              <div key={i} className="relative">
                <img src={s} alt={`shot ${i + 1}`} className="h-14 w-14 rounded object-cover" style={{ border: "1px solid #e2e8f0" }} />
                <button
                  onClick={() => setShots((arr) => arr.filter((_, j) => j !== i))}
                  className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-white"
                  style={{ background: "var(--seers-red)", fontSize: 10 }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <button
            onClick={capture}
            disabled={!camReady || busy}
            className="font-head-seers rounded-md px-5 py-2.5 uppercase tracking-[1.5px] text-white disabled:opacity-40"
            style={{ background: "var(--seers-green)", fontSize: 12, fontWeight: 700 }}
          >
            📸 Capture ({shots.length})
          </button>
          <div className="flex gap-2">
            {student.hasFace && (
              <button onClick={clear} disabled={busy} className="font-head-seers rounded-md border px-4 py-2.5 uppercase tracking-[1.5px] disabled:opacity-50" style={{ borderColor: "var(--seers-red)", color: "var(--seers-red)", fontSize: 12, fontWeight: 700 }}>
                Clear Enrollment
              </button>
            )}
            <button onClick={onClose} disabled={busy} className="font-head-seers rounded-md border px-4 py-2.5 uppercase tracking-[1.5px] disabled:opacity-50" style={{ borderColor: "var(--seers-teal)", color: "var(--seers-teal)", fontSize: 12, fontWeight: 700 }}>
              Cancel
            </button>
            <button onClick={submit} disabled={busy || shots.length === 0} className="font-head-seers rounded-md px-5 py-2.5 uppercase tracking-[1.5px] text-white disabled:opacity-50" style={{ background: "var(--seers-teal)", fontSize: 12, fontWeight: 700 }}>
              {busy ? "Saving…" : "Save Enrollment"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
