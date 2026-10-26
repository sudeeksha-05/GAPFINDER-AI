"use client";

import { ArrowRight, ChevronDown, FileText, GitBranch } from "lucide-react";
import Link from "next/link";
import { useStudyDemo } from "@/components/study-demo-provider";
import { MasteryBadge } from "@/components/ui/mastery-badge";

export function TopicExplorer() {
  const { data, focusedTopicId, setFocusedTopic } = useStudyDemo();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
        <span className="rounded-lg border border-violet-200/15 bg-violet-200/[0.06] px-3 py-2">{data.subject.name}</span>
        <ArrowRight aria-hidden="true" className="text-slate-600" size={13} />
        <span className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2">Unit</span>
        <ArrowRight aria-hidden="true" className="text-slate-600" size={13} />
        <span className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2">Topic</span>
        <span className="ml-auto">Expand a topic for sources and next steps</span>
      </div>

      {data.subject.units.map((unit) => {
        const unitTopics = data.topics.filter((topic) => unit.topicIds.includes(topic.id));
        if (!unitTopics.length) return null;
        return (
          <section className="surface-card overflow-hidden rounded-2xl" key={unit.id}>
            <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3.5">
              <span className="flex size-8 items-center justify-center rounded-lg bg-violet-300/[0.08] text-violet-100"><GitBranch aria-hidden="true" size={15} /></span>
              <div><h2 className="text-sm font-medium text-white">{unit.name}</h2><p className="mt-0.5 text-[11px] text-slate-500">{data.subject.name} · {unitTopics.length} topics in this sample</p></div>
            </div>
            <div className="divide-y divide-white/[0.05]">
              {unitTopics.map((topic) => {
                const isExpanded = focusedTopicId === topic.id;
                return (
                  <article key={topic.id}>
                    <button aria-expanded={isExpanded} className="flex w-full flex-wrap items-center gap-3 px-4 py-3.5 text-left transition hover:bg-white/[0.02] sm:flex-nowrap" onClick={() => setFocusedTopic(isExpanded ? null : topic.id)} type="button">
                      <ChevronDown aria-hidden="true" className={`shrink-0 text-slate-500 transition ${isExpanded ? "rotate-180" : ""}`} size={15} />
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-slate-200">{topic.name}</span><span className="mt-1 block text-[11px] text-slate-500">{topic.assessmentStatus} · source {topic.sourceCoverage.toLowerCase()}</span></span>
                      <div className="flex items-center gap-3"><span className="text-xs text-slate-400">{topic.mastery === null ? "—" : `${topic.mastery}% · demo`}</span><MasteryBadge status={topic.status} /></div>
                    </button>
                    {isExpanded && (
                      <div className="grid gap-4 border-t border-white/[0.05] bg-[#0b0e18]/45 px-4 py-4 sm:grid-cols-[1fr_auto]">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Source coverage</p><p className="mt-1 text-xs text-slate-300">{topic.sourceCoverage} · {topic.sourceTitle}</p><p className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500"><FileText aria-hidden="true" size={12} />{topic.sourceLocation}</p></div>
                          <div><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Assessment</p><p className="mt-1 text-xs text-slate-300">{topic.assessmentStatus === "Assessed" ? `Illustrative status: ${topic.status}` : "Not assessed — mastery is unknown."}</p></div>
                          <div className="sm:col-span-2"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Suggested next step</p><p className="mt-1 text-xs leading-5 text-slate-300">{topic.suggestedAction}</p></div>
                        </div>
                        <Link className="inline-flex h-fit items-center justify-center gap-2 rounded-xl border border-violet-200/15 bg-violet-200/[0.06] px-3 py-2 text-xs font-medium text-violet-100 hover:bg-violet-200/[0.12]" href={topic.assessmentStatus === "Assessed" ? "/gap-report" : "/assessment"} onClick={() => setFocusedTopic(topic.id)}>{topic.assessmentStatus === "Assessed" ? "Inspect sample evidence" : "Preview assessment"}<ArrowRight aria-hidden="true" size={13} /></Link>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
      <p className="text-xs leading-5 text-slate-500">Topics marked Not Assessed have no mastery classification. All example levels and source references are illustrative.</p>
    </div>
  );
}
