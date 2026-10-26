"use client";

import {
  ArrowRight,
  BookOpenCheck,
  BrainCircuit,
  CalendarDays,
  ChartNoAxesCombined,
  Clock3,
  Target,
} from "lucide-react";
import Link from "next/link";
import { useStudyDemo } from "@/components/study-demo-provider";
import { AppShell } from "@/components/layout/app-shell";
import { ProgressChart, TopicDistributionChart } from "@/components/dashboard/charts";
import { TopicMasteryCard } from "@/components/dashboard/topic-mastery-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatCard } from "@/components/ui/stat-card";
import { getDashboardSummary } from "@/lib/demo-data";

export default function DashboardPage() {
  const { data, goal } = useStudyDemo();
  const summary = getDashboardSummary(data);

  return (
    <AppShell title="Overview">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-slate-400">{data.subject.name} · illustrative demo</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Your {data.subject.shortName} learning overview</h1>
          <p className="mt-2 text-sm text-slate-400">{goal.selectedTopicIds.length ? `Focused on ${goal.selectedTopicIds.length} selected topic${goal.selectedTopicIds.length === 1 ? "" : "s"}.` : "Showing sample topics from this subject."}</p>
          <p className="mt-1 text-xs text-slate-500">{goal.examName || data.subject.examLabel} · {goal.examDate ? `Target ${new Date(`${goal.examDate}T12:00:00`).toLocaleDateString()}` : "No target date set"} · {goal.dailyMinutes} min/day · {goal.sessionDuration}-min sessions</p>
        </div>
        <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-violet-300 px-4 text-sm font-semibold text-[#11101c] transition hover:bg-violet-200" href="/assessment">
          <BrainCircuit aria-hidden="true" size={17} /> Preview diagnostic <ArrowRight aria-hidden="true" size={15} />
        </Link>
      </div>

      <section aria-label="Illustrative overview statistics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard accent="violet" detail={`In ${data.subject.name} · demo`} icon={BookOpenCheck} label="Topics in view" value={summary.topicsTracked} />
        <StatCard accent="cyan" detail="Illustrative assessed-topic average" icon={ChartNoAxesCombined} label="Average mastery" value={summary.averageMastery === null ? "—" : `${summary.averageMastery}%`} />
        <StatCard accent="pink" detail="Sample topics to review" icon={Target} label="Focus topics" value={summary.focusTopics} />
        <StatCard accent="amber" detail="Example planned sessions" icon={CalendarDays} label="Planned sessions" value={summary.sessionsPlanned} />
      </section>

      <section aria-label="Illustrative progress charts" className="mt-6 grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
        <article className="surface-card rounded-2xl p-4 sm:p-5">
          <SectionHeading description={`A sample ${data.subject.name} trend — not a record of real student progress.`} title="Learning progress" />
          <ProgressChart data={data} />
        </article>
        <article className="surface-card rounded-2xl p-4 sm:p-5">
          <SectionHeading description={`Sample ${data.subject.name} topic status mix.`} title="Mastery distribution" />
          <TopicDistributionChart data={data} />
          <div className="grid grid-cols-2 gap-2">
            {[
              ["Strong", "text-emerald-100"],
              ["Medium", "text-amber-100"],
              ["Weak", "text-rose-200"],
              ["Not Assessed", "text-slate-300"],
            ].map(([label, color]) => (
              <div className="flex items-center gap-2 text-xs text-slate-400" key={label}>
                <span className={`size-2 rounded-full ${label === "Strong" ? "bg-emerald-300" : label === "Medium" ? "bg-amber-300" : label === "Weak" ? "bg-rose-300" : "bg-slate-500"}`} />
                <span className={color}>{label}</span>
                <span className="ml-auto">{data.topics.filter((topic) => topic.status === label).length}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-8">
        <SectionHeading
          action={<Link className="text-xs font-medium text-violet-200 hover:text-white" href="/topics">View topic map <ArrowRight aria-hidden="true" className="ml-1 inline" size={13} /></Link>}
          description={`${data.subject.name} topic statuses and mastery percentages are illustrative demo values.`}
          title="Topic mastery"
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {data.topics.slice(0, 4).map((topic) => <TopicMasteryCard key={topic.id} topic={topic} />)}
        </div>
      </section>

      <section className="mt-8 grid gap-4 xl:grid-cols-2">
        <article className="surface-card rounded-2xl p-4 sm:p-5">
          <SectionHeading action={<Link className="text-xs text-violet-200 hover:text-white" href="/progress">All history <ArrowRight aria-hidden="true" className="ml-1 inline" size={13} /></Link>} title="Recent assessments" />
          <div className="divide-y divide-white/[0.06]">
            {data.assessments.map((assessment) => (
              <div className="flex items-center gap-3 py-3" key={assessment.id}>
                <span className="flex size-9 items-center justify-center rounded-xl bg-violet-300/[0.08] text-violet-100"><BrainCircuit aria-hidden="true" size={16} /></span>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-200">{assessment.title}</p><p className="mt-1 text-xs text-slate-500">{assessment.date} · {assessment.topics}</p></div>
                <span className="text-right text-xs font-medium text-white">{assessment.score}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-slate-500">All history shown is sample content.</p>
        </article>
        <article className="surface-card rounded-2xl p-4 sm:p-5">
          <SectionHeading action={<Link className="text-xs text-violet-200 hover:text-white" href="/revision-plan">Open plan <ArrowRight aria-hidden="true" className="ml-1 inline" size={13} /></Link>} title="Upcoming revision" />
          <div className="space-y-2">
            {data.revisionSessions.map((session) => (
              <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3" key={session.id}>
                <span className="flex size-9 items-center justify-center rounded-xl bg-cyan-200/[0.08] text-cyan-100"><Clock3 aria-hidden="true" size={16} /></span>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-200">{session.title}</p><p className="mt-1 text-xs text-slate-500">{session.time} · {session.duration}</p></div>
                <span className="text-[10px] text-slate-400">{session.status}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-slate-500">Example schedule for preview purposes only.</p>
        </article>
      </section>
    </AppShell>
  );
}
