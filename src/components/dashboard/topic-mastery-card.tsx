"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useStudyDemo } from "@/components/study-demo-provider";
import { MasteryBadge } from "@/components/ui/mastery-badge";
import type { Topic } from "@/lib/demo-data";

export function TopicMasteryCard({ topic }: { topic: Topic }) {
  const { setFocusedTopic } = useStudyDemo();
  const progressColor =
    topic.status === "Weak"
      ? "from-rose-300 to-orange-200"
      : topic.status === "Strong"
        ? "from-emerald-300 to-cyan-200"
        : "from-amber-200 to-violet-300";

  return (
    <Link className="topic-card group block rounded-2xl p-4" href="/gap-report" onClick={() => setFocusedTopic(topic.id)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-100">{topic.name}</p>
          <p className="mt-1 text-xs text-slate-500">{topic.subject}</p>
        </div>
        <ArrowUpRight aria-hidden="true" className="shrink-0 text-slate-600 transition group-hover:text-violet-200" size={15} />
      </div>
      <div className="mt-4 flex items-center justify-between gap-2">
        {topic.mastery !== null ? <span className="text-xs text-slate-300">{topic.mastery}% · demo</span> : <span className="text-xs text-slate-500">No assessment yet</span>}
        <MasteryBadge status={topic.status} />
      </div>
      <div aria-hidden="true" className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
        <div className={`h-full rounded-full bg-gradient-to-r ${progressColor}`} style={{ width: `${topic.mastery ?? 0}%` }} />
      </div>
    </Link>
  );
}
