"use client";

import { ArrowLeft, ArrowRight, BookOpen, Check, Flag, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useStudyDemo } from "@/components/study-demo-provider";
import { GroundedQuestionGenerator } from "@/components/assessment/grounded-question-generator";
import type { SubjectDemoData } from "@/lib/demo-data";

export function AssessmentExperience() {
  const { data, goal, focusedTopicId, setSubject } = useStudyDemo();
  const focusedQuestionIndex = data.questions.findIndex((item) => item.topicId === focusedTopicId);
  const scopeKey = `${data.subject.id}:${goal.selectedTopicIds.join(",")}:${focusedTopicId ?? ""}`;
  return (
    <>
      <GroundedQuestionGenerator
        initialSubjectId={goal.subjectId}
        initialTopicId={focusedTopicId ?? goal.selectedTopicIds[0] ?? null}
        key={`grounded:${data.subject.id}`}
        onSubjectChange={setSubject}
      />
      <AssessmentSession
        data={data}
        initialQuestionIndex={focusedQuestionIndex >= 0 ? focusedQuestionIndex : 0}
        key={scopeKey}
      />
    </>
  );
}

function AssessmentSession({
  data,
  initialQuestionIndex,
}: {
  data: SubjectDemoData;
  initialQuestionIndex: number;
}) {
  const [questionIndex, setQuestionIndex] = useState(initialQuestionIndex);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [marked, setMarked] = useState<string[]>([]);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const assessmentQuestions = data.questions;
  const question = assessmentQuestions[questionIndex];
  const multipleChoiceCount = assessmentQuestions.filter((item) => item.type === "multiple-choice").length;
  const answeredCount = Object.values(answers).filter((answer) => answer.trim()).length;
  const correctCount = assessmentQuestions.reduce((count, item) => count + (item.type === "multiple-choice" && answers[item.id] === item.correctAnswer ? 1 : 0), 0);

  function reset() {
    setQuestionIndex(0);
    setAnswers({});
    setMarked([]);
    setConfirmSubmit(false);
    setSubmitted(false);
  }

  if (submitted) {
    return (
      <section className="surface-card mx-auto max-w-3xl rounded-3xl p-5 sm:p-8">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-cyan-200/[0.1] text-cyan-100"><Check aria-hidden="true" size={21} /></span>
        <p className="eyebrow mt-5">Session-only demo result</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">A starting point for reflection.</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">This result was calculated locally from the sample questions you selected. It is not an AI assessment or evidence of your overall mastery.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4"><p className="text-xs text-slate-500">Sample questions</p><p className="mt-2 text-2xl font-semibold text-white">{assessmentQuestions.length}</p></div>
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4"><p className="text-xs text-slate-500">Answered</p><p className="mt-2 text-2xl font-semibold text-white">{answeredCount}</p></div>
          <div className="rounded-2xl border border-violet-200/10 bg-violet-200/[0.04] p-4"><p className="text-xs text-violet-100/70">Sample MC response</p><p className="mt-2 text-2xl font-semibold text-white">{correctCount} / {multipleChoiceCount}</p></div>
        </div>
        <div className="mt-5 rounded-2xl border border-amber-200/10 bg-amber-200/[0.035] p-4"><p className="text-sm font-medium text-amber-100">Interpret with care</p><p className="mt-1 text-xs leading-5 text-slate-400">Only sample multiple-choice questions from {data.subject.name} contribute to this local demonstration. Short answers are not graded. This is not enough evidence to make a reliable diagnosis.</p></div>
        <div className="mt-6 flex flex-wrap gap-3"><Link className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-violet-300 px-4 text-sm font-semibold text-[#11101c] hover:bg-violet-200" href="/gap-report">Explore sample gap report <ArrowRight aria-hidden="true" size={15} /></Link><button className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm text-slate-200 hover:bg-white/[0.04]" onClick={reset} type="button"><RotateCcw aria-hidden="true" size={14} />Restart preview</button></div>
      </section>
    );
  }

  if (!question) {
    return (
      <section className="surface-card mx-auto max-w-3xl rounded-2xl p-6">
        <p className="eyebrow">No sample questions for this selection</p>
        <h1 className="mt-2 text-xl font-semibold text-white">Choose another topic to preview.</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">The selected topics in {data.subject.name} do not have a sample question yet. Update your topic priorities to continue.</p>
        <Link className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl bg-violet-300 px-4 text-sm font-semibold text-[#11101c]" href="/onboarding">Update study goals <ArrowRight aria-hidden="true" size={14} /></Link>
      </section>
    );
  }
  const questionTopic = data.topics.find((topic) => topic.id === question.topicId);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-5 flex items-center justify-between text-xs text-slate-400"><span>Question {questionIndex + 1} of {assessmentQuestions.length}</span><span>{answeredCount} answered · {marked.length} for review</span></div>
      <div aria-label={`Assessment progress: question ${questionIndex + 1} of ${assessmentQuestions.length}`} className="mb-5 h-1.5 overflow-hidden rounded-full bg-white/[0.07]"><div className="h-full rounded-full bg-gradient-to-r from-violet-300 to-cyan-200 transition-all" style={{ width: `${((questionIndex + 1) / assessmentQuestions.length) * 100}%` }} /></div>
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <section className="surface-card rounded-2xl p-5 sm:p-7">
          <div className="flex items-center justify-between gap-3"><span className="eyebrow">{questionTopic?.name ?? data.subject.name} · {question.type === "multiple-choice" ? "Choose one" : "Short answer"}</span><span className="rounded-full border border-violet-200/15 bg-violet-200/[0.06] px-2.5 py-1 text-[10px] text-violet-100">SAMPLE ASSESSMENT</span></div>
          <h1 className="mt-5 text-xl font-semibold leading-8 text-white sm:text-2xl">{question.prompt}</h1>
          {question.type === "multiple-choice" ? (
            <fieldset className="mt-6 space-y-2"><legend className="sr-only">Select an answer</legend>{question.options.map((option, index) => {
              const selected = answers[question.id] === option;
              return <label className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition ${selected ? "border-violet-300/40 bg-violet-300/[0.08] text-white" : "border-white/[0.08] bg-white/[0.02] text-slate-300 hover:bg-white/[0.04]"}`} key={option}><input checked={selected} className="accent-violet-300" name={question.id} onChange={() => setAnswers((current) => ({ ...current, [question.id]: option }))} type="radio" /><span className="flex size-6 items-center justify-center rounded-full border border-white/10 text-[10px] text-slate-500">{String.fromCharCode(65 + index)}</span>{option}</label>;
            })}</fieldset>
          ) : <label className="mt-6 block"><span className="sr-only">Your short answer</span><textarea className="min-h-32 w-full rounded-xl border border-white/10 bg-[#0b0e18] p-4 text-sm leading-6 text-white outline-none placeholder:text-slate-600 focus:border-violet-300/50" onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))} placeholder="Write a brief explanation in your own words..." value={answers[question.id] ?? ""} /></label>}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
            <button className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-xs transition ${marked.includes(question.id) ? "bg-amber-200/[0.08] text-amber-100" : "text-slate-400 hover:bg-white/[0.04]"}`} onClick={() => setMarked((current) => current.includes(question.id) ? current.filter((id) => id !== question.id) : [...current, question.id])} type="button"><Flag aria-hidden="true" size={14} />{marked.includes(question.id) ? "Marked for review" : "Mark for review"}</button>
            <div className="flex gap-2"><button className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-xs text-slate-300 disabled:cursor-not-allowed disabled:opacity-40" disabled={questionIndex === 0} onClick={() => setQuestionIndex((index) => index - 1)} type="button"><ArrowLeft aria-hidden="true" size={14} />Previous</button>{questionIndex < assessmentQuestions.length - 1 ? <button className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-violet-300 px-4 text-xs font-semibold text-[#11101c] hover:bg-violet-200" onClick={() => setQuestionIndex((index) => index + 1)} type="button">Next <ArrowRight aria-hidden="true" size={14} /></button> : <button className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-violet-300 px-4 text-xs font-semibold text-[#11101c] hover:bg-violet-200" onClick={() => setConfirmSubmit(true)} type="button">Review &amp; submit <Check aria-hidden="true" size={14} /></button>}</div>
          </div>
        </section>
        <aside className="surface-card rounded-2xl p-5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-cyan-200/[0.08] text-cyan-100"><BookOpen aria-hidden="true" size={17} /></span>
          <h2 className="mt-4 text-sm font-semibold text-white">Sample source reference</h2>
          <p className="mt-2 text-xs leading-5 text-slate-400">{question.source}</p>
          <div className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 text-[11px] leading-5 text-slate-500">Example source only. This question was not generated from or verified against an uploaded document.</div>
          <p className="mt-5 text-xs font-medium text-slate-300">The aim is understanding, not just a score.</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">Use the question to notice what feels clear and what you might want to revisit.</p>
        </aside>
      </div>
      {confirmSubmit && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setConfirmSubmit(false)}><section aria-labelledby="submit-title" aria-modal="true" className="surface-card w-full max-w-md rounded-2xl p-5 shadow-2xl" onClick={(event) => event.stopPropagation()} role="dialog"><h2 className="text-lg font-semibold text-white" id="submit-title">Finish this demo assessment?</h2><p className="mt-2 text-sm leading-6 text-slate-400">Your selections will be evaluated locally for this preview only. Nothing is saved or sent to a service.</p><div className="mt-5 flex justify-end gap-2"><button className="min-h-10 rounded-xl border border-white/10 px-4 text-sm text-slate-300" onClick={() => setConfirmSubmit(false)} type="button">Keep reviewing</button><button className="min-h-10 rounded-xl bg-violet-300 px-4 text-sm font-semibold text-[#11101c]" onClick={() => { setConfirmSubmit(false); setSubmitted(true); }} type="button">Show demo result</button></div></section></div>}
    </div>
  );
}
