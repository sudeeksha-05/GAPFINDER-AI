"use client";

import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, Check, Clock3, Sparkles, Target } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_STUDY_GOAL, SUBJECT_OPTIONS, getSubjectDemoData, type StudyGoal, type SubjectId } from "@/lib/demo-data";
import { saveStudyGoalAction } from "@/app/auth/actions";

const steps = ["Study goal", "Time", "Priorities", "Review"];

export function OnboardingFlow({ initialGoal }: { initialGoal?: StudyGoal }) {
  const [step, setStep] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const router = useRouter();
  const [goal, setGoal] = useState<StudyGoal>(() => initialGoal ?? DEFAULT_STUDY_GOAL);
  const subjectData = getSubjectDemoData(goal.subjectId);

  function next(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step < 3) setStep((current) => current + 1);
  }

  function togglePriority(topicId: string) {
    const selectedTopicIds = goal.selectedTopicIds.includes(topicId)
      ? goal.selectedTopicIds.filter((id) => id !== topicId)
      : [...goal.selectedTopicIds, topicId];
    setGoal({ ...goal, selectedTopicIds });
  }

  function changeSubject(subjectId: SubjectId) {
    setGoal((current) => ({ ...current, subjectId, selectedTopicIds: [] }));
  }

  function saveGoal() {
    setSaveError(null);
    startSaving(async () => {
      const result = await saveStudyGoalAction(goal);
      if (result.error) {
        setSaveError(result.error);
        return;
      }
      router.replace("/dashboard");
    });
  }

  const selectedSubject = subjectData.subject;
  const selectedTopics = subjectData.topics.filter((topic) => goal.selectedTopicIds.includes(topic.id));

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between text-xs text-slate-400"><span>Step {step + 1} of {steps.length}</span><span>{steps[step]}</span></div>
        <div aria-label={`Step ${step + 1} of ${steps.length}`} className="grid grid-cols-4 gap-2">
          {steps.map((label, index) => <div className={`h-1.5 rounded-full ${index <= step ? "bg-gradient-to-r from-violet-300 to-cyan-200" : "bg-white/[0.08]"}`} key={label} />)}
        </div>
      </div>

      <section className="surface-card rounded-3xl p-5 sm:p-8">
        {step === 0 && (
          <form onSubmit={next}>
            <span className="flex size-11 items-center justify-center rounded-2xl bg-violet-300/[0.1] text-violet-100"><BookOpen aria-hidden="true" size={20} /></span>
            <p className="eyebrow mt-5">Start with your goal</p>
            <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">What are you preparing for?</h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">Choose a subject first. Topic choices and every demo screen will follow that subject.</p>
            <label className="mt-6 block text-sm font-medium text-slate-200" htmlFor="study-subject">Subject<select className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-[#0b0e18] px-4 text-sm text-white outline-none transition focus:border-violet-300/50" id="study-subject" onChange={(event) => { const subject = SUBJECT_OPTIONS.find((option) => option.id === event.target.value); if (subject) changeSubject(subject.id); }} value={goal.subjectId}>{SUBJECT_OPTIONS.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>
            <label className="mt-5 block text-sm font-medium text-slate-200" htmlFor="exam-name">Exam or study goal name <span className="font-normal text-slate-500">(optional)</span></label>
            <input autoComplete="off" className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-[#0b0e18] px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-300/50 focus:ring-2 focus:ring-violet-300/10" id="exam-name" onChange={(event) => setGoal({ ...goal, examName: event.target.value })} placeholder={`e.g. ${selectedSubject?.examLabel ?? "Course exam"}`} value={goal.examName} />
            <div className="mt-5 rounded-xl border border-cyan-200/10 bg-cyan-200/[0.035] p-3 text-xs leading-5 text-slate-400"><Sparkles aria-hidden="true" className="mr-2 inline text-cyan-100" size={14} />Your study goal is saved to your private account when you finish setup.</div>
            <div className="mt-7 flex justify-end"><button className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-violet-300 px-5 text-sm font-semibold text-[#11101c] hover:bg-violet-200" type="submit">Continue <ArrowRight aria-hidden="true" size={15} /></button></div>
          </form>
        )}

        {step === 1 && (
          <form onSubmit={next}>
            <span className="flex size-11 items-center justify-center rounded-2xl bg-cyan-200/[0.1] text-cyan-100"><CalendarDays aria-hidden="true" size={20} /></span>
            <p className="eyebrow mt-5">Set your timeline</p>
            <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">When do you want to be ready?</h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">A target date and realistic study time help make a future plan more relevant.</p>
            <label className="mt-6 block text-sm font-medium text-slate-200" htmlFor="exam-date">Exam or target date</label>
            <input className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-[#0b0e18] px-4 text-sm text-white outline-none focus:border-violet-300/50" id="exam-date" min={new Date().toISOString().slice(0, 10)} onChange={(event) => setGoal({ ...goal, examDate: event.target.value })} required type="date" value={goal.examDate} />
            <label className="mt-6 block text-sm font-medium text-slate-200" htmlFor="daily-minutes">Study time available per day</label>
            <select className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-[#0b0e18] px-4 text-sm text-white outline-none focus:border-violet-300/50" id="daily-minutes" onChange={(event) => setGoal({ ...goal, dailyMinutes: Number(event.target.value) })} value={goal.dailyMinutes}><option value="20">About 20 minutes</option><option value="45">About 45 minutes</option><option value="60">About 1 hour</option><option value="90">About 1.5 hours</option></select>
            <div className="mt-7 flex justify-between"><button className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm text-slate-300 hover:bg-white/[0.04]" onClick={() => setStep(0)} type="button"><ArrowLeft aria-hidden="true" size={15} />Back</button><button className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-violet-300 px-5 text-sm font-semibold text-[#11101c] hover:bg-violet-200" type="submit">Continue <ArrowRight aria-hidden="true" size={15} /></button></div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={next}>
            <span className="flex size-11 items-center justify-center rounded-2xl bg-fuchsia-200/[0.1] text-fuchsia-100"><Target aria-hidden="true" size={20} /></span>
            <p className="eyebrow mt-5">Choose your priorities</p>
            <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">Which topics matter most?</h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">Topics are grouped under <span className="text-slate-200">{subjectData.subject.name}</span> units. No topics from other subjects appear here.</p>
            <fieldset className="mt-6 space-y-4">
              <legend className="sr-only">Choose topics to prioritize</legend>
              {subjectData.subject.units.map((unit) => {
                const unitTopics = subjectData.topics.filter((topic) => unit.topicIds.includes(topic.id));
                if (!unitTopics.length) return null;
                return <fieldset className="rounded-2xl border border-white/[0.07] bg-white/[0.015] p-3" key={unit.id}><legend className="px-2 text-xs font-semibold text-violet-100">{unit.name}</legend><div className="grid gap-2 sm:grid-cols-2">{unitTopics.map((topic) => {
                  const checked = goal.selectedTopicIds.includes(topic.id);
                  return <label className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3 text-sm transition ${checked ? "border-violet-300/35 bg-violet-300/[0.08] text-white" : "border-white/[0.08] bg-white/[0.02] text-slate-300 hover:bg-white/[0.04]"}`} key={topic.id}><input checked={checked} className="accent-violet-300" onChange={() => togglePriority(topic.id)} type="checkbox" />{topic.name}</label>;
                })}</div></fieldset>;
              })}
            </fieldset>
            <label className="mt-6 block text-sm font-medium text-slate-200" htmlFor="session-duration">Preferred study-session duration</label>
            <div className="relative mt-2"><Clock3 aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} /><select className="min-h-12 w-full rounded-xl border border-white/10 bg-[#0b0e18] pl-11 pr-4 text-sm text-white outline-none focus:border-violet-300/50" id="session-duration" onChange={(event) => setGoal({ ...goal, sessionDuration: Number(event.target.value) })} value={goal.sessionDuration}><option value="15">15 minutes</option><option value="25">25 minutes</option><option value="40">40 minutes</option><option value="60">60 minutes</option></select></div>
            <p className="mt-3 text-xs text-slate-500">{goal.selectedTopicIds.length ? `${goal.selectedTopicIds.length} topic${goal.selectedTopicIds.length === 1 ? "" : "s"} selected. The demo will focus on these.` : "No specific priorities selected. The demo will show all topics in this subject."}</p>
            <div className="mt-7 flex justify-between"><button className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm text-slate-300 hover:bg-white/[0.04]" onClick={() => setStep(1)} type="button"><ArrowLeft aria-hidden="true" size={15} />Back</button><button className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-violet-300 px-5 text-sm font-semibold text-[#11101c] hover:bg-violet-200" type="submit">Review goals <ArrowRight aria-hidden="true" size={15} /></button></div>
          </form>
        )}

        {step === 3 && (
          <div>
            <span className="flex size-11 items-center justify-center rounded-2xl bg-emerald-200/[0.1] text-emerald-100"><Check aria-hidden="true" size={20} /></span>
            <p className="eyebrow mt-5">Your study snapshot</p>
            <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">A goal worth working toward.</h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">Review the choices you made. Going back keeps your selections.</p>
            <dl className="mt-6 divide-y divide-white/[0.07] rounded-2xl border border-white/[0.07] bg-[#0b0e18]/60 px-4">
              <div className="flex justify-between gap-4 py-4"><dt className="text-sm text-slate-400">Subject</dt><dd className="text-right text-sm font-medium text-white">{subjectData.subject.name}</dd></div>
              <div className="flex justify-between gap-4 py-4"><dt className="text-sm text-slate-400">Exam or goal</dt><dd className="text-right text-sm font-medium text-white">{goal.examName || subjectData.subject.examLabel}</dd></div>
              <div className="flex justify-between gap-4 py-4"><dt className="text-sm text-slate-400">Exam date</dt><dd className="text-right text-sm font-medium text-white">{goal.examDate ? new Date(`${goal.examDate}T12:00:00`).toLocaleDateString() : "Not set"}</dd></div>
              <div className="flex justify-between gap-4 py-4"><dt className="text-sm text-slate-400">Study time</dt><dd className="text-right text-sm font-medium text-white">{goal.dailyMinutes} min per day</dd></div>
              <div className="flex justify-between gap-4 py-4"><dt className="text-sm text-slate-400">Session length</dt><dd className="text-right text-sm font-medium text-white">{goal.sessionDuration} minutes</dd></div>
              <div className="py-4"><dt className="text-sm text-slate-400">Priorities · {subjectData.subject.name}</dt><dd className="mt-2 flex flex-wrap gap-2">{selectedTopics.length ? selectedTopics.map((topic) => <span className="rounded-full border border-violet-200/15 bg-violet-200/[0.06] px-2.5 py-1 text-xs text-violet-100" key={topic.id}>{topic.name}</span>) : <span className="text-sm text-slate-500">All topics in {subjectData.subject.name}</span>}</dd></div>
            </dl>
            <p className="mt-4 text-xs leading-5 text-slate-500">Save these choices to your private account. No assessment or AI analysis is performed.</p>
            {saveError ? <p className="mt-4 rounded-xl border border-rose-300/20 bg-rose-300/[0.05] p-3 text-sm text-rose-100" role="alert">{saveError}</p> : null}
            <div className="mt-7 flex flex-wrap justify-between gap-3"><button className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm text-slate-300 hover:bg-white/[0.04]" onClick={() => setStep(2)} type="button"><ArrowLeft aria-hidden="true" size={15} />Edit priorities</button><button className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-violet-300 px-5 text-sm font-semibold text-[#11101c] hover:bg-violet-200 disabled:cursor-wait disabled:opacity-60" disabled={isSaving} onClick={saveGoal} type="button">{isSaving ? "Saving..." : "Save study goal"} <ArrowRight aria-hidden="true" size={15} /></button></div>
          </div>
        )}
      </section>
    </div>
  );
}
