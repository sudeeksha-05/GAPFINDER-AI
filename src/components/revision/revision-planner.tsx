"use client";

import { ArrowRight, BookOpen, CalendarClock, Check, CircleHelp, Clock3, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useStudyDemo } from "@/components/study-demo-provider";
import { MasteryBadge } from "@/components/ui/mastery-badge";

export function RevisionPlanner() {
  const { data, goal, setFocusedTopic } = useStudyDemo();
  const [completed, setCompleted] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [rescheduled, setRescheduled] = useState(false);
  const activeSessionIds = new Set(data.revisionSessions.map((session) => session.id));
  const completedCount = completed.filter((id) => activeSessionIds.has(id)).length;

  return (
    <div className="space-y-5">
      <section className="surface-card rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="eyebrow">{data.subject.name} · illustrative week</p><h2 className="mt-2 text-xl font-semibold text-white">Plan your next study sessions</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Topics are ordered by sample gap evidence. Schedule and reasons are examples, not personalized recommendations.</p></div>
          <span className="sample-pill">DEMO PLAN</span>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3"><p className="text-xs text-slate-500">Available time · your goal</p><p className="mt-1 text-sm font-medium text-white">{goal.dailyMinutes} min / day</p></div>
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3"><p className="text-xs text-slate-500">Upcoming exam · your goal</p><p className="mt-1 text-sm font-medium text-white">{goal.examDate ? new Date(`${goal.examDate}T12:00:00`).toLocaleDateString() : "No date set"}</p></div>
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3"><p className="text-xs text-slate-500">Preview tasks completed</p><p className="mt-1 text-sm font-medium text-white">{completedCount} of {data.revisionSessions.length}</p><p className="mt-1 text-[10px] text-slate-500">Preferred session: {goal.sessionDuration} min</p></div>
        </div>
      </section>
      <section className="space-y-3">
        {data.revisionSessions.map((session, index) => {
          const isDone = completed.includes(session.id);
          const isExpanded = expanded === session.id;
          return (
            <article className={`surface-card overflow-hidden rounded-2xl transition ${isDone ? "border-emerald-200/15" : ""}`} key={session.id}>
              <div className="flex flex-wrap items-center gap-3 p-4 sm:p-5">
                <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${isDone ? "bg-emerald-200/[0.1] text-emerald-100" : "bg-violet-200/[0.08] text-violet-100"}`}>{isDone ? <Check aria-hidden="true" size={17} /> : <span className="font-mono text-xs">0{index + 1}</span>}</span>
                <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className={`text-sm font-semibold ${isDone ? "text-emerald-100" : "text-white"}`}>{session.title}</h2><MasteryBadge status={session.status} /></div><p className="mt-1 text-xs text-slate-500">{session.subject} · {session.time} · {session.duration}</p></div>
                <button aria-expanded={isExpanded} className="min-h-9 rounded-lg px-3 text-xs text-slate-400 hover:bg-white/[0.04] hover:text-white" onClick={() => { setExpanded(isExpanded ? null : session.id); setFocusedTopic(isExpanded ? null : session.topicId); }} type="button">{isExpanded ? "Hide details" : "Task details"}</button>
                <button aria-pressed={isDone} className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium ${isDone ? "border border-emerald-200/15 text-emerald-100" : "bg-violet-300 px-3 text-[#11101c] hover:bg-violet-200"}`} onClick={() => setCompleted((current) => isDone ? current.filter((id) => id !== session.id) : [...current, session.id])} type="button">{isDone ? <><RotateCcw aria-hidden="true" size={12} />Undo</> : "Mark complete"}</button>
              </div>
              {isExpanded && <div className="grid gap-4 border-t border-white/[0.06] bg-[#0b0e18]/40 px-4 py-4 sm:grid-cols-3 sm:px-5"><div><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Why this is prioritized</p><p className="mt-1 text-xs leading-5 text-slate-300">{session.reason}</p></div><div><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Activity</p><p className="mt-1 text-xs leading-5 text-slate-300">{session.activity}</p></div><div><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Recommended source</p><p className="mt-1 flex items-start gap-1.5 text-xs leading-5 text-slate-300"><BookOpen aria-hidden="true" className="mt-0.5 shrink-0 text-cyan-100" size={13} />{session.source}</p><Link className="mt-3 inline-flex items-center gap-1 text-xs text-violet-200 hover:text-white" href="/topics">Open topic map <ArrowRight aria-hidden="true" size={12} /></Link></div></div>}
            </article>
          );
        })}
          {!data.revisionSessions.length && <div className="surface-card rounded-2xl p-5 text-sm text-slate-300">No weak or medium topics are selected for {data.subject.name}. Choose additional priorities in your study goals to see sample revision activities.</div>}
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-cyan-200/10 bg-cyan-200/[0.025] p-4"><p className="flex items-center gap-2 text-sm font-medium text-cyan-50"><CalendarClock aria-hidden="true" size={16} />Next assessment</p><p className="mt-2 text-xs leading-5 text-slate-400">After reviewing a topic, revisit its sample diagnostic to compare what feels clearer. This is a suggested workflow, not a scheduled real test.</p><Link className="mt-3 inline-flex items-center gap-1 text-xs text-cyan-100 hover:text-white" href="/assessment">Preview assessment <ArrowRight aria-hidden="true" size={12} /></Link></div>
        <div className="rounded-2xl border border-amber-200/10 bg-amber-200/[0.025] p-4"><p className="flex items-center gap-2 text-sm font-medium text-amber-50"><CircleHelp aria-hidden="true" size={16} />Missed a session?</p><p className="mt-2 text-xs leading-5 text-slate-400">{rescheduled ? "Preview session moved to the next available day in this page session." : "A future plan can make it easier to pick up where you left off."}</p><button className="mt-3 inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-amber-100/10 px-3 text-xs text-amber-100 hover:bg-amber-100/[0.05]" onClick={() => setRescheduled((value) => !value)} type="button"><RotateCcw aria-hidden="true" size={12} />{rescheduled ? "Undo reschedule preview" : "Reschedule preview"}</button></div>
      </section>
      <p className="flex items-center gap-2 text-[11px] text-slate-500"><Clock3 aria-hidden="true" size={13} />Completion and rescheduling controls update only this page session; the plan is not persisted.</p>
    </div>
  );
}
