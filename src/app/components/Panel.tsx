import type { ReactNode } from "react";

interface PanelProps {
  title: string;
  right?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
}

// Shared white card with a titled header, matching the reference .panel style.
export function Panel({ title, right, children, bodyClassName = "p-4" }: PanelProps) {
  return (
    <div
      className="overflow-hidden rounded-[10px] border bg-white"
      style={{ borderColor: "#e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,.06)" }}
    >
      <div
        className="flex items-center justify-between border-b bg-slate-50 px-[18px] py-3"
        style={{ borderColor: "#e8edf4" }}
      >
        <span className="font-head-seers uppercase tracking-[2px]" style={{ fontSize: 13, fontWeight: 700, color: "var(--seers-teal)" }}>
          {title}
        </span>
        {right}
      </div>
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}
