import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Panel } from "./Panel";
import type { Student } from "../lib/types";

interface QrScannerPanelProps {
  students: Student[];
  scanCount: number;
  lastScanId: string;
  onScan: (id: string) => void;
}

function Progress({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="mb-3.5">
      <div className="font-mono-seers mb-1.5 flex justify-between" style={{ fontSize: 12 }}>
        <span style={{ color: "var(--seers-gray)" }}>{label}</span>
        <span style={{ color: "var(--seers-gray)" }}>{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded" style={{ background: "#e2e8f0" }}>
        <div className="h-full rounded transition-[width] duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

// USB/webcam QR check-in. Camera decode uses jsQR; a hidden input captures
// keyboard-wedge USB scanners. Scanned IDs are marked safe via onScan.
export function QrScannerPanel({ students, scanCount, lastScanId, onScan }: QrScannerPanelProps) {
  const [camOn, setCamOn] = useState(false);
  const [camStatus, setCamStatus] = useState("");
  const [manualId, setManualId] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastDecodeRef = useRef<{ id: string; t: number }>({ id: "", t: 0 });

  const total = students.length || 1;
  const qrDone = students.filter((s) => s.method === "qr" || s.method === "manual").length;
  const faceDone = students.filter((s) => s.method === "face").length;
  const overall = students.filter((s) => s.status === "safe").length;
  const pct = (n: number) => Math.round((n / total) * 100);

  useEffect(() => {
    if (!camOn) return;
    let stream: MediaStream | null = null;
    let cancelled = false;

    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (cancelled) return;
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();
        setCamStatus("Scanning for QR codes…");
        tick();
      } catch {
        setCamStatus("Camera unavailable — check permissions.");
      }
    };

    const tick = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(img.data, img.width, img.height);
      if (code?.data) {
        const now = Date.now();
        // debounce duplicate reads of the same code
        if (code.data !== lastDecodeRef.current.id || now - lastDecodeRef.current.t > 2500) {
          lastDecodeRef.current = { id: code.data, t: now };
          onScan(code.data.trim());
          setCamStatus(`Scanned: ${code.data.trim()}`);
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    start();
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [camOn, onScan]);

  const submitManual = (e: React.FormEvent) => {
    e.preventDefault();
    const id = manualId.trim();
    if (id) {
      onScan(id);
      setManualId("");
    }
  };

  return (
    <Panel
      title="QR Scanner"
      right={<span className="font-mono-seers" style={{ fontSize: 10, color: "var(--seers-gray)" }}>USB / WEBCAM</span>}
      bodyClassName="p-3"
    >
      <div
        className="relative overflow-hidden rounded-lg border p-4 text-center"
        style={{ background: "#f8fafc", borderColor: "#e2e8f0" }}
      >
        {camOn && <div className="seers-scan-line" />}
        <div style={{ fontSize: 36, margin: "8px 0" }}>📡</div>
        <div className="font-head-seers" style={{ fontSize: 26, fontWeight: 900, color: "var(--seers-ink)" }}>{scanCount}</div>
        <div className="font-mono-seers" style={{ fontSize: 11, color: "var(--seers-gray)" }}>scans detected</div>
        <div className="font-mono-seers min-h-[20px]" style={{ fontSize: 13, color: "var(--seers-teal)" }}>
          {lastScanId || "Waiting for scan…"}
        </div>
      </div>

      {camOn && (
        <div className="relative mt-2.5">
          <video ref={videoRef} className="w-full rounded-md" style={{ background: "#0f172a" }} playsInline muted />
          <canvas ref={canvasRef} className="hidden" />
          <div className="font-mono-seers mt-1 text-center" style={{ fontSize: 10, color: "var(--seers-gray)" }}>{camStatus}</div>
        </div>
      )}

      <div className="mt-2.5 flex gap-2">
        <button
          onClick={() => setCamOn((v) => !v)}
          className="font-head-seers flex-1 rounded px-3.5 py-1.5 uppercase tracking-[1px] text-white"
          style={{ background: camOn ? "var(--seers-red)" : "var(--seers-teal)", fontSize: 11, fontWeight: 700 }}
        >
          {camOn ? "✕ Stop Camera" : "📷 Use Camera"}
        </button>
      </div>

      <form onSubmit={submitManual} className="mt-2 flex gap-2">
        <input
          value={manualId}
          onChange={(e) => setManualId(e.target.value)}
          placeholder="Type / USB-scan an ID…"
          className="font-mono-seers flex-1 rounded-md border bg-slate-50 px-3 py-1.5 outline-none focus:border-[var(--seers-teal)]"
          style={{ borderColor: "#e2e8f0", fontSize: 12, color: "var(--seers-ink)" }}
        />
        <button className="font-head-seers rounded border px-3 py-1.5 uppercase tracking-[1px]" style={{ borderColor: "var(--seers-teal)", color: "var(--seers-teal)", fontSize: 11, fontWeight: 700 }}>
          Check In
        </button>
      </form>

      <div className="mt-3">
        <Progress label="QR / Manual Coverage" pct={pct(qrDone)} color="var(--seers-teal)" />
        <Progress label="Face Recognition" pct={pct(faceDone)} color="var(--seers-orange)" />
        <Progress label="Overall Headcount" pct={pct(overall)} color="var(--seers-green)" />
      </div>
    </Panel>
  );
}
