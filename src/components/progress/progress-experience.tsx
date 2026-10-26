"use client";

import { ArrowRight, BookOpenCheck, CheckCircle2, CircleAlert, RotateCcw, Sparkles } from "lucide-react";
import Link from "next/link";
import { TopicProgressChart } from "@/components/dashboard/charts";
import { useStudyDemo } from "@/components/study-demo-provider";
import { SectionHeading } from "@/components/ui/section-heading";

export function ProgressExperience() {
  const { data } = useStudyDemo();
  const topicProgressHistory = data.topicProgressHistory;
  const currentSample = topicProgressHistory[topicProgressHistory.length - 1];
  const previousSample = topicProgressHistory[0];
  const trackedTopics = data.topics.filter((topic) => topic.mastery !== null).slice(0, 2);
  const progressChanges = trackedTopics.map((topic) => ({
    name: topic.name,
    start: Number(previousSample?.[topic.id] ?? 0),
    latest: Number(currentSample?.[topic.id] ?? 0),
  }));

  return (
    <div className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <section className="surface-card rounded-2xl p-4 sm:p-5"><SectionHeading description={`Illustrative ${data.subject.name} values across example checks; not real student progress.`} title="Topic mastery over attempts" /><TopicProgressChart data={data} /><div className="flex flex-wrap gap-4 text-[11px] text-slate-400">{trackedTopics.map((topic, index) => <span className="flex items-center gap-2" key={topic.id}><span className={`size-2 rounded-full ${index === 0 ? "bg-violet-200" : "bg-cyan-200"}`} />{topic.name}</span>)}</div></section>
        <section className="surface-card rounded-2xl p-5"><p className="eyebrow">Learning change · demo</p><h2 className="mt-3 text-lg font-semibold text-white">Progress is more than a single score.</h2><p className="mt-2 text-xs leading-5 text-slate-400">Compare patterns across attempts, revision, and source evidence. This small sample is not enough to confirm lasting mastery.</p><div className="mt-5 space-y-3">{progressChanges.map((topic) => <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3" key={topic.name}><div className="flex justify-between gap-2 text-xs"><span className="text-slate-300">{topic.name}</span><span className="text-cyan-100">{topic.start}% → {topic.latest}%</span></div><p className="mt-1 text-[10px] text-slate-500">Illustrative change across sample attempts</p></div>)}</div></section>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-emerald-200/10 bg-emerald-200/[0.025] p-4"><p className="flex items-center gap-2 text-sm font-semibold text-emerald-100"><CheckCircle2 aria-hidden="true" size={16} />Improving in this example</p><p className="mt-2 text-xs leading-5 text-slate-400">{progressChanges.map((topic) => topic.name).join(" and ") || `Topics in ${data.subject.name}`} trend upward across the small illustrative history.</p></article>
        <article className="rounded-2xl border border-rose-200/10 bg-rose-200/[0.025] p-4"><p className="flex items-center gap-2 text-sm font-semibold text-rose-100"><CircleAlert aria-hidden="true" size={16} />Persistent focus sample</p><p className="mt-2 text-xs leading-5 text-slate-400">{data.topics.find((topic) => topic.status === "Weak")?.name ?? "No weak topic selected"} remains a suggested focus in this sample.</p></article>
        <article className="rounded-2xl border border-violet-200/10 bg-violet-200/[0.025] p-4"><p className="flex items-center gap-2 text-sm font-semibold text-violet-100"><BookOpenCheck aria-hidden="true" size={16} />Revision check-ins</p><p className="mt-2 text-xs leading-5 text-slate-400">{data.revisionSessions.length} {data.subject.name} sample sessions are available to review. Completion controls are session-only in the revision planner and are not recorded here.</p></article>
      </section>

      <section className="surface-card rounded-2xl p-4 sm:p-5">
        <SectionHeading title="Assessment history" description={`Example ${data.subject.name} assessment entries.`} />
        <div className="overflow-x-auto"><table className="w-full min-w-[540px] text-left text-sm"><thead><tr className="border-b border-white/[0.07] text-xs text-slate-500"><th className="px-3 py-3 font-medium">Assessment</th><th className="px-3 py-3 font-medium">Date</th><th className="px-3 py-3 font-medium">Coverage</th><th className="px-3 py-3 text-right font-medium">Sample result</th></tr></thead><tbody>{data.assessments.map((assessment) => <tr className="border-b border-white/[0.05] text-slate-300 last:border-0" key={assessment.id}><td className="px-3 py-4 font-medium text-slate-200">{assessment.title}</td><td className="px-3 py-4 text-slate-400">{assessment.date}</td><td className="px-3 py-4 text-slate-400">{assessment.topics}</td><td className="px-3 py-4 text-right text-white">{assessment.score}</td></tr>)}</tbody></table></div>
      </section>
      <section className="flex flex-col justify-between gap-4 rounded-2xl border border-cyan-200/10 bg-cyan-200/[0.025] p-5 sm:flex-row sm:items-center"><div><p className="flex items-center gap-2 text-sm font-semibold text-cyan-50"><RotateCcw aria-hidden="true" size={16} />Recheck what you have revised</p><p className="mt-1 text-xs text-slate-400">The next sample assessment can help compare what feels clearer after review.</p></div><Link className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-violet-300 px-4 text-xs font-semibold text-[#11101c] hover:bg-violet-200" href="/assessment">Preview a new assessment <ArrowRight aria-hidden="true" size={13} /></Link></section>
      <p className="flex items-start gap-2 text-[11px] leading-5 text-slate-500"><Sparkles aria-hidden="true" className="mt-0.5 shrink-0" size={12} />All progress trends, assessment entries, and revisions shown are illustrative demo data.</p>
    </div>
  );
}
