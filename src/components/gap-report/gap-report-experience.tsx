"use client";

import { ArrowRight, BookOpen, Check, ChevronDown, CircleHelp, FileText, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { useStudyDemo } from "@/components/study-demo-provider";
import { MasteryBadge } from "@/components/ui/mastery-badge";

export function GapReportExperience() {
  const { data, focusedTopicId, setFocusedTopic } = useStudyDemo();
  const selected = data.topics.find((topic) => topic.id === focusedTopicId)
    ?? data.topics.find((topic) => topic.status === "Weak")
    ?? data.topics[0];
  useEffect(() => {
    if (!data.topics.some((topic) => topic.id === focusedTopicId)) {
      setFocusedTopic(data.topics.find((topic) => topic.status === "Weak")?.id ?? data.topics[0]?.id ?? null);
    }
  }, [data, focusedTopicId, setFocusedTopic]);
  const weak = data.topics.filter((topic) => topic.status === "Weak");
  const strong = data.topics.filter((topic) => topic.status === "Strong");
  const medium = data.topics.filter((topic) => topic.status === "Medium");
  const unassessed = data.topics.filter((topic) => topic.status === "Not Assessed");
  const diagnostic = data.diagnosticResults.find((result) => result.topicId === selected?.id);
  const coverageCount = diagnostic?.sampleCoverage ?? 0;

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Weak · sample", items: weak, style: "text-rose-100 border-rose-200/10" },
          { label: "Medium · sample", items: medium, style: "text-amber-100 border-amber-200/10" },
          { label: "Strong · sample", items: strong, style: "text-emerald-100 border-emerald-200/10" },
          { label: "Not assessed", items: unassessed, style: "text-slate-200 border-white/[0.08]" },
        ].map((group) => <article className={`surface-card rounded-2xl border p-4 ${group.style}`} key={group.label}><p className="text-xs opacity-75">{group.label}</p><p className="mt-2 text-2xl font-semibold text-white">{group.items.length}</p><p className="mt-2 truncate text-[11px] opacity-70">{group.items.map((topic) => topic.name).join(", ") || "No topics in this category"}</p></article>)}
      </section>

      <div className="grid gap-4 xl:grid-cols-[0.7fr_1.3fr]">
        <section className="surface-card rounded-2xl p-4 sm:p-5">
          <div className="mb-4"><h2 className="text-sm font-semibold text-white">Topic report</h2><p className="mt-1 text-xs text-slate-500">Select a topic to inspect sample evidence.</p></div>
          <div className="space-y-1.5">
            {data.topics.map((topic) => <button aria-pressed={topic.id === selected?.id} className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${topic.id === selected?.id ? "border-violet-200/20 bg-violet-200/[0.07]" : "border-transparent hover:bg-white/[0.03]"}`} key={topic.id} onClick={() => setFocusedTopic(topic.id)} type="button"><span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium text-slate-200">{topic.name}</span><span className="mt-1 block text-[10px] text-slate-500">{topic.mastery === null ? "No result yet" : `${topic.mastery}% · illustrative`}</span></span><MasteryBadge status={topic.status} /></button>)}
          </div>
        </section>

        <section className="surface-card rounded-2xl p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="eyebrow">Topic detail · illustrative</p><h2 className="mt-2 text-xl font-semibold text-white">{selected?.name ?? "No topic selected"}</h2><p className="mt-1 text-xs text-slate-500">{selected?.subject ?? data.subject.name} · sample diagnostic snapshot</p></div>
            {selected && <MasteryBadge status={selected.status} />}
          </div>
          {!selected ? (
            <p className="mt-5 text-sm text-slate-400">Select a subject with topics to view its sample report.</p>
          ) : selected.mastery === null ? (
            <div className="mt-5 rounded-2xl border border-slate-300/10 bg-white/[0.02] p-4"><p className="flex items-center gap-2 text-sm font-medium text-slate-200"><CircleHelp aria-hidden="true" size={16} />Mastery is unknown</p><p className="mt-2 text-xs leading-5 text-slate-400">This topic has not been assessed. We do not classify untested knowledge as weak.</p></div>
          ) : (
            <>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-cyan-200/10 bg-cyan-200/[0.04] px-3 py-1.5 text-[10px] text-cyan-100">Coverage · {coverageCount} sample prompts</span>
                <span className="rounded-full border border-amber-200/10 bg-amber-200/[0.04] px-3 py-1.5 text-[10px] text-amber-100">Confidence · {diagnostic?.confidence.toLowerCase() ?? "unknown"}</span>
                <span className="rounded-full border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 text-[10px] text-slate-400">Source coverage · {selected.sourceCoverage}</span>
              </div>
              <div className="mt-5 rounded-2xl border border-white/[0.07] bg-[#0b0e18]/55 p-4">
                <div className="flex items-baseline justify-between"><span className="text-xs text-slate-400">Illustrative mastery indicator</span><span className="text-2xl font-semibold text-white">{selected.mastery}<span className="text-sm text-slate-500">%</span></span></div>
                <div aria-label={`${selected.mastery}% illustrative topic indicator`} className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.07]" role="img"><div className="h-full rounded-full bg-gradient-to-r from-violet-300 to-cyan-200" style={{ width: `${selected.mastery}%` }} /></div>
                <p className="mt-3 text-[11px] leading-5 text-slate-500">A small sample indicator is not proof of mastery. Interpret it alongside response evidence, source coverage, and assessment coverage.</p>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-rose-200/10 bg-rose-200/[0.025] p-4"><p className="text-xs font-semibold text-rose-100">What may be difficult</p><p className="mt-2 text-xs leading-5 text-slate-300">{diagnostic?.evidence[0] ?? selected.observedGap}</p></div>
                <div className="rounded-xl border border-violet-200/10 bg-violet-200/[0.025] p-4"><p className="text-xs font-semibold text-violet-100">Why it is highlighted</p><p className="mt-2 text-xs leading-5 text-slate-300">This example is based on {coverageCount} sample prompt{coverageCount === 1 ? "" : "s"}. {diagnostic?.confidence ?? "No"} confidence; the assessment is illustrative only.</p></div>
              </div>
              <div className="mt-4 rounded-xl border border-cyan-200/10 bg-cyan-200/[0.025] p-4">
                <p className="flex items-center gap-2 text-xs font-semibold text-cyan-50"><BookOpen aria-hidden="true" size={14} />Supporting material reference</p>
                <p className="mt-2 text-xs text-slate-300">{selected.sourceTitle}</p><p className="mt-1 text-[11px] text-slate-500">{selected.sourceLocation}</p>
              </div>
              {coverageCount > 0 && <div className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4"><p className="flex items-center gap-2 text-xs font-semibold text-slate-200"><FileText aria-hidden="true" size={14} />Illustrative response evidence</p><ul className="mt-2 space-y-2 text-xs leading-5 text-slate-400">{diagnostic?.evidence.map((evidence) => <li className="flex gap-2" key={evidence}><span className="text-amber-100">•</span>{evidence}</li>)}</ul></div>}
            </>
          )}
          {selected && <><div className="mt-4 rounded-xl border border-emerald-200/10 bg-emerald-200/[0.025] p-4"><p className="text-xs font-semibold text-emerald-100">Suggested next step</p><p className="mt-2 text-xs leading-5 text-slate-300">{selected.suggestedAction}</p></div>
          <div className="mt-5 flex flex-wrap gap-2"><Link className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-violet-300 px-4 text-xs font-semibold text-[#11101c] hover:bg-violet-200" href="/revision-plan">Open sample revision plan <ArrowRight aria-hidden="true" size={14} /></Link><button className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-xs text-slate-300" onClick={() => setFocusedTopic(data.topics.find((topic) => topic.status === "Weak")?.id ?? data.topics[0]?.id ?? null)} type="button"><ChevronDown aria-hidden="true" className="rotate-[-90deg]" size={13} />First focus topic</button></div>
          <p className="mt-4 text-[10px] text-slate-600"><Sparkles aria-hidden="true" className="mr-1 inline" size={11} />Illustrative demo evidence, not a real student diagnosis.</p>
          </>}
        </section>
      </div>
      <div className="rounded-2xl border border-amber-200/10 bg-amber-200/[0.025] p-4 text-xs leading-5 text-slate-400"><Check aria-hidden="true" className="mr-2 inline text-amber-100" size={14} />Diagnosis should be supported by more than one signal. Topics without assessment evidence remain Not Assessed, and low sample scores should not be treated as definitive.</div>
    </div>
  );
}
