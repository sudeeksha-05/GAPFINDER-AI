"use client";

import { BookOpenCheck, LoaderCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { z } from "zod";
import { SUBJECT_OPTIONS, getSubjectDemoData, type SubjectId } from "@/lib/demo-data";
import { gradedAttemptSchema } from "@/lib/assessment/submission-validation";

const generatedResponseSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("insufficient_evidence"),
    message: z.string(),
  }),
  z.object({
    status: z.literal("generated"),
    quizId: z.string().uuid(),
    subject: z.string(),
    topic: z.string(),
    difficulty: z.enum(["beginner", "intermediate", "advanced"]),
    questions: z.array(
      z.object({
        id: z.string().uuid(),
        prompt: z.string(),
        options: z.array(z.string()).length(4),
        source: z.object({
          documentName: z.string(),
          pageNumber: z.number().int().positive().nullable(),
          sectionHeading: z.string().nullable(),
          sourceReference: z.string().nullable(),
        }),
      }),
    ),
  }),
]);
type GeneratedSource = {
  documentName: string;
  pageNumber: number | null;
  sectionHeading: string | null;
  sourceReference: string | null;
};

function responseError(payload: unknown) {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }
  return "Question generation could not be completed. Please retry.";
}

function citationLabel(source: GeneratedSource) {
  const location =
    source.sectionHeading ??
    source.sourceReference ??
    (source.pageNumber ? `Page ${source.pageNumber}` : null);
  return location ? `${source.documentName} · ${location}` : source.documentName;
}

export function GroundedQuestionGenerator({
  initialSubjectId,
  initialTopicId,
  onSubjectChange,
}: {
  initialSubjectId: SubjectId;
  initialTopicId: string | null;
  onSubjectChange: (subjectId: SubjectId) => void;
}) {
  const [subjectId, setSubjectId] = useState(initialSubjectId);
  const [topicId, setTopicId] = useState(
    getSubjectDemoData(initialSubjectId).topics.some((topic) => topic.id === initialTopicId)
      ? initialTopicId ?? ""
      : getSubjectDemoData(initialSubjectId).topics[0]?.id ?? "",
  );
  const [difficulty, setDifficulty] = useState<"beginner" | "intermediate" | "advanced">("intermediate");
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [signInRequired, setSignInRequired] = useState(false);
  const [result, setResult] = useState<z.infer<typeof generatedResponseSchema> | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const [gradedAttempt, setGradedAttempt] = useState<z.infer<typeof gradedAttemptSchema> | null>(null);

  const topics = getSubjectDemoData(subjectId).topics;

  async function generateQuestions() {
    setLoading(true);
    setError("");
    setSignInRequired(false);
    setResult(null);
    setAnswers({});
    setGradedAttempt(null);
    setSubmissionError("");
    try {
      const response = await fetch("/api/assessment/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId, topicId, difficulty, count }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        setError(responseError(payload));
        setSignInRequired(response.status === 401);
        return;
      }
      const parsed = generatedResponseSchema.safeParse(payload);
      if (!parsed.success) {
        setError("The generated quiz returned an unexpected response. Retry shortly.");
        return;
      }
      setResult(parsed.data);
    } catch {
      setError("Could not connect to the question service. Check your connection and retry.");
    } finally {
      setLoading(false);
    }
  }

  async function submitQuiz(quizId: string) {
    setSubmitting(true);
    setSubmissionError("");
    try {
      const response = await fetch("/api/assessment/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizId,
          responses: Object.entries(answers).map(([questionId, answer]) => ({
            questionId,
            answer,
          })),
        }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        setSubmissionError(responseError(payload));
        return;
      }
      const parsed = gradedAttemptSchema.safeParse(payload);
      if (!parsed.success) {
        setSubmissionError("The graded result returned an unexpected response. Retry or contact support.");
        return;
      }
      setGradedAttempt(parsed.data);
    } catch {
      setSubmissionError("Could not submit this quiz. Check your connection and retry.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="surface-card mb-7 rounded-3xl p-5 sm:p-7">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cyan-200/[0.09] text-cyan-100">
          <Sparkles aria-hidden="true" size={18} />
        </span>
        <div>
          <p className="eyebrow">Your materials · source-grounded</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Generate a diagnostic quiz</h2>
          <p className="mt-1 text-sm leading-6 text-slate-400">
            Questions use only relevant passages from your processed private uploads. Correct answers and explanations stay hidden until you submit.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs text-slate-400">
          Subject
          <select
            className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-[#0b0e18] px-3 text-sm text-white outline-none focus:border-violet-300/50"
            onChange={(event) => {
              const nextSubject = SUBJECT_OPTIONS.find((item) => item.id === event.target.value);
              if (!nextSubject) return;
              const nextId = nextSubject.id;
              setSubjectId(nextId);
              setTopicId(getSubjectDemoData(nextId).topics[0]?.id ?? "");
              setResult(null);
              onSubjectChange(nextId);
            }}
            value={subjectId}
          >
            {SUBJECT_OPTIONS.map((subject) => (
              <option key={subject.id} value={subject.id}>{subject.name}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-400">
          Topic
          <select
            className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-[#0b0e18] px-3 text-sm text-white outline-none focus:border-violet-300/50"
            onChange={(event) => {
              setTopicId(event.target.value);
              setResult(null);
            }}
            value={topicId}
          >
            {topics.map((topic) => (
              <option key={topic.id} value={topic.id}>{topic.name}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-400">
          Difficulty
          <select
            className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-[#0b0e18] px-3 text-sm text-white outline-none focus:border-violet-300/50"
            onChange={(event) => {
              if (event.target.value === "beginner" || event.target.value === "intermediate" || event.target.value === "advanced") {
                setDifficulty(event.target.value);
              }
            }}
            value={difficulty}
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </label>
        <label className="text-xs text-slate-400">
          Questions
          <select
            className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-[#0b0e18] px-3 text-sm text-white outline-none focus:border-violet-300/50"
            onChange={(event) => setCount(Number(event.target.value))}
            value={count}
          >
            {[3, 5, 8, 10].map((number) => (
              <option key={number} value={number}>{number} questions</option>
            ))}
          </select>
        </label>
      </div>

      <button
        className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-violet-300 px-4 text-sm font-semibold text-[#11101c] transition hover:bg-violet-200 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={loading || !topicId}
        onClick={() => void generateQuestions()}
        type="button"
      >
        {loading ? <LoaderCircle aria-hidden="true" className="animate-spin" size={16} /> : <Sparkles aria-hidden="true" size={15} />}
        {loading ? "Searching your sources and writing questions…" : "Generate from my materials"}
      </button>

      {error && (
        <div className="mt-4 rounded-xl border border-rose-200/15 bg-rose-200/[0.04] p-4 text-sm text-rose-100" role="alert">
          {error}
          {signInRequired && (
            <Link className="ml-2 underline underline-offset-4" href="/auth/sign-in?next=%2Fassessment">
              Sign in
            </Link>
          )}
        </div>
      )}

      {result?.status === "insufficient_evidence" && (
        <div className="mt-4 rounded-xl border border-amber-200/15 bg-amber-200/[0.04] p-4 text-sm leading-6 text-amber-50" role="status">
          <p className="font-medium">More study material needed</p>
          <p className="mt-1 text-amber-100/75">{result.message}</p>
          <Link className="mt-2 inline-block text-amber-100 underline underline-offset-4" href="/materials">
            Open private materials
          </Link>
        </div>
      )}

      {result?.status === "generated" && (
        <div className="mt-6 space-y-3" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-white">
              {result.topic} · {result.difficulty} · {result.questions.length} questions
            </h3>
            <span className="rounded-full border border-emerald-200/15 bg-emerald-200/[0.05] px-2.5 py-1 text-[10px] font-semibold tracking-wider text-emerald-100">
              SAVED TO YOUR ACCOUNT
            </span>
          </div>
          {result.questions.map((question, index) => (
            <article className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 sm:p-5" key={question.id}>
              <p className="text-xs font-medium text-violet-100">Question {index + 1}</p>
              <h4 className="mt-2 text-sm font-semibold leading-6 text-white">{question.prompt}</h4>
              <fieldset className="mt-3 grid gap-2 sm:grid-cols-2" disabled={Boolean(gradedAttempt)}>
                <legend className="sr-only">Choose your answer</legend>
                {question.options.map((option, optionIndex) => (
                  <label
                    className={`flex cursor-pointer gap-2 rounded-xl border p-3 text-xs leading-5 transition ${
                      answers[question.id] === option
                        ? "border-violet-300/40 bg-violet-300/[0.08] text-white"
                        : "border-white/[0.06] bg-black/10 text-slate-300"
                    }`}
                    key={`${question.id}-${optionIndex}`}
                  >
                    <input
                      checked={answers[question.id] === option}
                      className="mt-0.5 accent-violet-300"
                      name={question.id}
                      onChange={() => setAnswers((current) => ({ ...current, [question.id]: option }))}
                      type="radio"
                    />
                    <span className="text-slate-500">{String.fromCharCode(65 + optionIndex)}.</span>
                    <span>{option}</span>
                  </label>
                ))}
              </fieldset>
              <p className="mt-3 flex items-start gap-2 text-[11px] leading-5 text-cyan-100/75">
                <BookOpenCheck aria-hidden="true" className="mt-0.5 shrink-0" size={13} />
                Source: {citationLabel(question.source)}
              </p>
              {gradedAttempt && (() => {
                const graded = gradedAttempt.questions.find((item) => item.questionId === question.id);
                if (!graded) return null;
                return (
                  <div className={`mt-4 rounded-xl border p-3 text-xs leading-5 ${
                    graded.isCorrect
                      ? "border-emerald-200/15 bg-emerald-200/[0.04] text-emerald-50"
                      : "border-amber-200/15 bg-amber-200/[0.04] text-amber-50"
                  }`}>
                    <p className="font-semibold">
                      {graded.isCorrect ? "Correct" : graded.selectedAnswer ? "Not quite" : "Unanswered"}
                      {!graded.isCorrect && ` · Correct answer: ${graded.correctAnswer}`}
                    </p>
                    {graded.explanation && <p className="mt-1 text-slate-300">{graded.explanation}</p>}
                    {(graded.documentName || graded.sourceReference) && (
                      <p className="mt-2 text-cyan-100/75">
                        Source: {[graded.documentName, graded.sourceReference].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                );
              })()}
            </article>
          ))}
          {!gradedAttempt ? (
            <>
              <p className="text-xs leading-5 text-slate-500">
                Unanswered questions will be submitted as unanswered and count as incorrect. You can submit this quiz once.
              </p>
              {submissionError && <p className="text-sm text-rose-100" role="alert">{submissionError}</p>}
              <button
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-cyan-200 px-4 text-sm font-semibold text-[#0b0e18] transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={submitting}
                onClick={() => void submitQuiz(result.quizId)}
                type="button"
              >
                {submitting && <LoaderCircle aria-hidden="true" className="animate-spin" size={16} />}
                {submitting ? "Submitting and grading…" : `Submit quiz · ${Object.keys(answers).length}/${result.questions.length} answered`}
              </button>
            </>
          ) : (
            <div className="rounded-2xl border border-violet-200/15 bg-violet-200/[0.04] p-5" role="status">
              <p className="eyebrow">Assessment result</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {gradedAttempt.score} / {gradedAttempt.maxScore}
                <span className="ml-2 text-sm font-normal text-slate-400">
                  ({Math.round((gradedAttempt.score / gradedAttempt.maxScore) * 100)}%)
                </span>
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Submitted {new Date(gradedAttempt.submittedAt).toLocaleString()}. Answers were graded on the server.
              </p>
            </div>
          )}
          <p className="text-xs leading-5 text-slate-500">
            Correct answers and explanations are withheld until your submission has been graded.
          </p>
        </div>
      )}
    </section>
  );
}
