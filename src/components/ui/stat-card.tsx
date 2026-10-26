import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  accent = "violet",
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: LucideIcon;
  accent?: "violet" | "cyan" | "pink" | "amber";
}) {
  const iconColors = {
    violet: "text-violet-200 bg-violet-300/10",
    cyan: "text-cyan-100 bg-cyan-200/10",
    pink: "text-fuchsia-100 bg-fuchsia-200/10",
    amber: "text-amber-100 bg-amber-200/10",
  };

  return (
    <article className="surface-card rounded-2xl p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-white">{value}</p>
        </div>
        <span className={`flex size-10 items-center justify-center rounded-xl ${iconColors[accent]}`}>
          <Icon aria-hidden="true" size={19} />
        </span>
      </div>
      <p className="mt-3 text-xs text-slate-500">{detail}</p>
    </article>
  );
}
