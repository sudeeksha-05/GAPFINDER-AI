"use client";

import {
  ArrowRight,
  Atom,
  BookOpenCheck,
  BrainCircuit,
  ChartNoAxesCombined,
  Check,
  CircleHelp,
  FileUp,
  Fingerprint,
  GitBranch,
  Lightbulb,
  LockKeyhole,
  Search,
  Sparkles,
  Target,
} from "lucide-react";
import { motion, MotionConfig } from "framer-motion";
import Link from "next/link";
import { topics, revisionSessions } from "@/lib/demo-data";

const problems = [
  { icon: Search, problem: "Familiarity feels like mastery.", solution: "Spot what you can confidently explain — not just what looks familiar." },
  { icon: CircleHelp, problem: "Small gaps stay hidden.", solution: "Connect related ideas to reveal the foundations worth revisiting." },
  { icon: BookOpenCheck, problem: "Generic plans miss the point.", solution: "Focus revision on the topics that need your attention most." },
];

const steps = [
  { number: "01", title: "Add your materials", text: "Bring in notes and study resources to give your learning a starting point.", icon: FileUp },
  { number: "02", title: "Map your syllabus", text: "Organize a subject into the key topics and concepts you need to know.", icon: GitBranch },
  { number: "03", title: "Check your knowledge", text: "Use focused diagnostic questions to reflect on what you understand.", icon: BrainCircuit },
  { number: "04", title: "Plan what comes next", text: "Turn topic-level insights into a revision plan with a clear next step.", icon: Target },
];

const features = [
  { title: "Smart Material Upload", text: "A future home for your notes, worksheets, and course resources.", icon: FileUp, tone: "violet" },
  { title: "Automatic Topic Mapping", text: "See how ideas relate across your syllabus and learning materials.", icon: GitBranch, tone: "cyan" },
  { title: "AI Diagnostic Quizzes", text: "Check understanding with topic-focused questions, not guesswork.", icon: BrainCircuit, tone: "pink" },
  { title: "Knowledge Gap Reports", text: "Make strong foundations and topics to revisit easier to see.", icon: ChartNoAxesCombined, tone: "amber" },
  { title: "Adaptive Revision Planning", text: "Shape a more focused study routine around your learning needs.", icon: BookOpenCheck, tone: "cyan" },
  { title: "Source-Grounded Assistant", text: "Explore explanations linked to the study materials you provide.", icon: Lightbulb, tone: "violet" },
];

const plans = revisionSessions.slice(0, 3);
const previewTopics = ["Decision Trees", "Logistic Regression", "Random Forests", "Clustering"]
  .map((name) => topics.find((topic) => topic.name === name))
  .filter((topic) => topic !== undefined);

export function LandingContent() {
  return (
    <MotionConfig reducedMotion="user">
      <section className="site-shell relative grid min-h-[670px] items-center gap-8 pb-16 pt-16 lg:grid-cols-[1fr_0.94fr] lg:pb-24 lg:pt-20" id="product">
        <div aria-hidden="true" className="landing-glow -left-48 top-6" />
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10"
          initial={{ opacity: 0, y: 22 }}
          transition={{ duration: 0.65, ease: "easeOut" }}
        >
          <p className="eyebrow mb-6"><span className="eyebrow-dot" aria-hidden="true" />Personalized learning, powered by evidence</p>
          <h1 className="max-w-3xl text-5xl font-semibold leading-[1.04] tracking-[-0.055em] text-white sm:text-6xl lg:text-[4.65rem]">
            Stop Revising
            <br />
            What You <span className="gradient-text">Already</span>
            <br />
            <span className="gradient-text">Know.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
            Your syllabus tells you what to study. GapFinder AI discovers what you haven&apos;t mastered yet — and builds a smarter revision plan around it.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-violet-300 px-6 text-sm font-semibold text-[#11101c] shadow-[0_8px_34px_rgb(139_92_246/22%)] transition hover:bg-violet-200" href="/onboarding">
              Discover My Knowledge Gaps <ArrowRight aria-hidden="true" size={16} />
            </Link>
            <Link className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.035] px-6 text-sm font-semibold text-slate-100 transition hover:border-white/25 hover:bg-white/[0.07]" href="/gap-report">
              Explore a Sample Report <ArrowRight aria-hidden="true" size={15} />
            </Link>
          </div>
          <p className="mt-5 text-xs text-slate-500">A product preview. Assessments and personalization are not active yet.</p>
        </motion.div>

        <motion.div
          aria-label="Illustrative dashboard preview showing sample mastery and revision data"
          className="relative mx-auto w-full max-w-[520px]"
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          role="img"
          transition={{ duration: 0.7, delay: 0.12 }}
          viewport={{ once: true }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
        >
          <div className="preview-card relative overflow-hidden rounded-[1.7rem] p-4 sm:p-5">
            <div aria-hidden="true" className="preview-glow" />
            <div className="relative">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-slate-400">Your learning overview</p>
                  <h2 className="mt-1 text-lg font-semibold text-white">Topic mastery</h2>
                </div>
                <span className="rounded-full border border-violet-200/15 bg-violet-200/[0.07] px-2.5 py-1 text-[9px] font-semibold tracking-wider text-violet-100">ILLUSTRATIVE</span>
              </div>
              <div className="mt-5 space-y-3">
                {previewTopics.map((topic, index) => (
                  <div className="rounded-2xl border border-white/[0.07] bg-[#0b0e18]/75 p-3.5" key={topic.id}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-100">{topic.name}</p>
                        <p className="mt-0.5 text-[11px] text-slate-500">{topic.subject}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium ${topic.status === "Weak" ? "bg-rose-300/10 text-rose-200" : topic.status === "Strong" ? "bg-emerald-200/10 text-emerald-100" : topic.status === "Not Assessed" ? "bg-slate-300/10 text-slate-300" : "bg-amber-200/10 text-amber-100"}`}>{topic.status}</span>
                    </div>
                    <div aria-label={`${topic.name} ${topic.mastery === null ? "not assessed" : `illustrative mastery ${topic.mastery}%`}`} className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.07]" role="img">
                      <motion.div
                        animate={{ width: `${topic.mastery ?? 0}%` }}
                        className={`h-full rounded-full ${index === 1 ? "bg-gradient-to-r from-violet-400 to-fuchsia-300" : index === 2 ? "bg-gradient-to-r from-rose-300 to-orange-200" : "bg-gradient-to-r from-cyan-300 to-blue-400"}`}
                        initial={{ width: 0 }}
                        transition={{ duration: 0.9, delay: 0.2 + index * 0.1 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-cyan-200/10 text-cyan-100"><Sparkles aria-hidden="true" size={17} /></span>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-white">Suggested next step</p>
                  <p className="mt-1 truncate text-[11px] text-slate-400">Review trigonometric ratios · 20 min</p>
                </div>
                <ArrowRight aria-hidden="true" className="ml-auto shrink-0 text-slate-500" size={15} />
              </div>
              <div className="mt-3 rounded-2xl border border-rose-200/10 bg-rose-200/[0.035] p-3.5">
                <div className="flex items-center justify-between gap-2"><p className="text-xs font-medium text-rose-100">Why Decision Trees is highlighted</p><span className="text-[10px] text-slate-500">EXAMPLE</span></div>
                <p className="mt-1.5 text-[11px] leading-5 text-slate-400">A sample response mixed up entropy and information gain. See the example reference: Machine learning foundations · pages 42–47.</p>
              </div>
            </div>
          </div>
          <div className="preview-caption mx-auto mt-3 w-fit">Sample content for visual demonstration only</div>
        </motion.div>
      </section>

      <section className="site-shell py-20 sm:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16">
          <div>
            <p className="eyebrow">The study struggle</p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl">Effort is not the same as progress.</h2>
            <p className="mt-4 text-sm leading-7 text-slate-400">Studying harder only helps when you know where your attention will make the biggest difference.</p>
          </div>
          <div className="grid gap-3">
            {problems.map(({ icon: Icon, problem, solution }, index) => (
              <motion.article className="problem-row" initial={{ opacity: 0, x: 12 }} key={problem} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.35, delay: index * 0.07 }}>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-violet-200/15 bg-violet-200/[0.07] text-violet-100"><Icon aria-hidden="true" size={18} /></span>
                <div className="min-w-0">
                  <h3 className="font-medium text-white">{problem}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-400">{solution}</p>
                </div>
                <Check aria-hidden="true" className="ml-auto hidden shrink-0 text-cyan-200 sm:block" size={17} />
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="section-band py-20 sm:py-24" id="how-it-works">
        <div className="site-shell">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <p className="eyebrow justify-center">How it works</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">A clearer path, <span className="gradient-text">step by step.</span></h2>
            <p className="mt-4 text-sm leading-6 text-slate-400">A preview of the product workflow. These steps are not yet connected to live services.</p>
          </div>
          <div className="workflow-grid grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {steps.map(({ number, title, text, icon: Icon }, index) => (
              <motion.article className="workflow-card" initial={{ opacity: 0, y: 14 }} key={number} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.4, delay: index * 0.08 }}>
                <div className="flex items-center justify-between">
                  <span className="flex size-10 items-center justify-center rounded-xl border border-violet-200/15 bg-violet-200/[0.07] text-violet-100"><Icon aria-hidden="true" size={18} /></span>
                  <span className="font-mono text-xs text-slate-500">{number}</span>
                </div>
                <h3 className="mt-6 text-base font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
              </motion.article>
            ))}
          </div>
          <p className="mt-5 text-center text-xs text-slate-500">Workflow preview · Upload, quizzes, and personalized outputs are not currently active.</p>
        </div>
      </section>

      <section className="site-shell py-20 sm:py-24" id="features">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">A more focused study toolkit</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Designed around how <span className="gradient-text">you learn.</span></h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-slate-400">Each capability is part of the product vision. The cards below are visual previews, not active integrations.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {features.map(({ title, text, icon: Icon, tone }, index) => (
            <motion.article className="landing-feature" initial={{ opacity: 0, y: 16 }} key={title} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.4, delay: (index % 3) * 0.06 }}>
              <span className={`flex size-11 items-center justify-center rounded-2xl border ${tone === "violet" ? "border-violet-200/15 bg-violet-200/[0.08] text-violet-100" : tone === "cyan" ? "border-cyan-200/15 bg-cyan-200/[0.08] text-cyan-100" : tone === "pink" ? "border-fuchsia-200/15 bg-fuchsia-200/[0.08] text-fuchsia-100" : "border-amber-200/15 bg-amber-200/[0.08] text-amber-100"}`}><Icon aria-hidden="true" size={20} /></span>
              <h3 className="mt-5 font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="site-shell pb-20 sm:pb-24">
        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="showcase-panel">
            <div className="flex items-start justify-between gap-4">
              <div><p className="eyebrow">Topic mastery</p><h2 className="mt-3 text-xl font-semibold text-white">See the shape of what you know.</h2></div>
              <span className="sample-pill">SAMPLE</span>
            </div>
            <p className="mt-2 text-sm text-slate-400">Illustrative topic states, not assessment results.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {previewTopics.map((topic) => (
                <div className="rounded-2xl border border-white/[0.07] bg-[#0a0c14]/50 p-3.5" key={topic.id}>
                  <div className="flex items-center justify-between gap-2"><span className="truncate text-sm text-slate-200">{topic.name}</span><span className={`text-xs ${topic.status === "Weak" ? "text-rose-200" : topic.status === "Strong" ? "text-emerald-100" : "text-amber-100"}`}>{topic.status}</span></div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.07]"><div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-cyan-300" style={{ width: `${topic.mastery ?? 0}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
          <div className="showcase-panel">
            <div className="flex items-start justify-between gap-4">
              <div><p className="eyebrow">Revision plan</p><h2 className="mt-3 text-xl font-semibold text-white">One useful next step at a time.</h2></div>
              <span className="sample-pill">PREVIEW</span>
            </div>
            <p className="mt-2 text-sm text-slate-400">An example schedule for exploring the concept.</p>
            <div className="mt-6 space-y-2.5">
              {plans.map((plan, index) => (
                <div className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-[#0a0c14]/50 p-3.5" key={plan.id}>
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-cyan-200/[0.08] font-mono text-xs text-cyan-100">0{index + 1}</span>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-white">{plan.title}</p><p className="mt-1 text-xs text-slate-500">{plan.time} · {plan.duration}</p></div>
                  <span className="hidden rounded-full border border-white/10 px-2 py-1 text-[10px] text-slate-300 sm:block">{plan.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="site-shell pb-20 sm:pb-24">
        <div className="mb-8 max-w-2xl"><p className="eyebrow">A more useful study loop</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">From revisiting everything to <span className="gradient-text">knowing what next.</span></h2></div>
        <div className="grid gap-3 md:grid-cols-2">
          <article className="journey-panel"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Before · equal time for every topic</p><div className="mt-5 space-y-2">{["Linear Regression", "Decision Trees", "Clustering"].map((name) => <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-3 text-xs text-slate-300" key={name}><span>{name}</span><span className="text-slate-500">Same revision time</span></div>)}</div><p className="mt-4 text-xs leading-5 text-slate-500">A common study pattern can spend equal effort even when needs differ.</p></article>
          <article className="journey-panel journey-panel-after"><p className="text-xs font-semibold uppercase tracking-wider text-cyan-100">After · a sample evidence-led focus</p><div className="mt-5 rounded-xl border border-rose-200/10 bg-rose-200/[0.03] p-3"><p className="text-sm font-medium text-white">Decision Trees · sample focus</p><p className="mt-1 text-xs leading-5 text-slate-400">The example answer confuses entropy with information gain. Review the cited section, then try five focused questions.</p></div><p className="mt-4 text-xs leading-5 text-slate-500">Illustrative example only — no real learner result or performance claim.</p></article>
        </div>
      </section>

      <section className="site-shell pb-20 sm:pb-24">
        <div className="privacy-panel">
          <div className="relative z-10 grid gap-8 md:grid-cols-[auto_1fr] md:items-center">
            <span className="flex size-14 items-center justify-center rounded-2xl border border-cyan-200/15 bg-cyan-200/[0.08] text-cyan-100"><Fingerprint aria-hidden="true" size={25} /></span>
            <div><p className="eyebrow">Privacy &amp; evidence</p><h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">Learning should feel clear and trustworthy.</h2><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">GapFinder AI is being designed to keep learning context transparent and explanations tied to study sources. This interface is a preview; no materials are uploaded, stored, or analyzed here.</p></div>
          </div>
          <div className="relative z-10 mt-7 flex flex-wrap gap-2">
            <span className="trust-chip"><LockKeyhole aria-hidden="true" size={14} /> Privacy-minded by design</span>
            <span className="trust-chip"><Atom aria-hidden="true" size={14} /> Source-grounded vision</span>
          </div>
        </div>
      </section>

      <section className="site-shell pb-10">
        <div className="cta-panel">
          <div className="relative z-10 mx-auto max-w-2xl text-center">
            <p className="eyebrow justify-center"><span className="eyebrow-dot" aria-hidden="true" />Discover What You Don&apos;t Know</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Make your next study session count.</h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-300">Explore the illustrative dashboard and see the product foundation in action. The displayed data is sample content only.</p>
            <Link className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-violet-300 px-6 text-sm font-semibold text-[#11101c] transition hover:bg-violet-200" href="/onboarding">Set up a study goal <ArrowRight aria-hidden="true" size={16} /></Link>
          </div>
        </div>
      </section>
    </MotionConfig>
  );
}
