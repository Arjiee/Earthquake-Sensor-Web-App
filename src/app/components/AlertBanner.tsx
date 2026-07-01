// Blinking red evacuation banner shown while an earthquake is active.
export function AlertBanner({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div
      className="seers-blink font-head-seers relative z-[99] py-3 text-center uppercase tracking-[3px] text-white"
      style={{ background: "var(--seers-red)", fontSize: 16, fontWeight: 700 }}
    >
      ⚠ EARTHQUAKE DETECTED — EMERGENCY EVACUATION PROTOCOL ACTIVATED ⚠
    </div>
  );
}
