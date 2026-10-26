import type { MasteryStatus } from "@/lib/demo-data";

const styles: Record<MasteryStatus, string> = {
  Weak: "border-rose-300/20 bg-rose-300/10 text-rose-200",
  Medium: "border-amber-200/20 bg-amber-200/10 text-amber-100",
  Strong: "border-emerald-200/20 bg-emerald-200/10 text-emerald-100",
  "Not Assessed": "border-slate-300/15 bg-slate-300/[0.06] text-slate-300",
};

export function MasteryBadge({ status }: { status: MasteryStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${styles[status]}`}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}
