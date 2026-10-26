import { Info } from "lucide-react";

export function DemoDataNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border border-violet-300/15 bg-violet-300/[0.06] text-violet-100 ${
        compact ? "px-3 py-2.5 text-xs" : "px-4 py-3 text-sm"
      }`}
      role="note"
    >
      <Info aria-hidden="true" className="mt-0.5 shrink-0 text-violet-200" size={16} />
      <p>
        <span className="mr-2 font-semibold tracking-wide">DEMO DATA</span>
        Illustrative preview only — these are not real student results or AI assessments.
      </p>
    </div>
  );
}
