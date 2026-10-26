import {
  ArrowRight,
  BrainCircuit,
  CalendarDays,
  ChartNoAxesCombined,
  FileText,
  GitBranch,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { AssistantExperience } from "@/components/assistant/assistant-experience";
import { AssessmentExperience } from "@/components/assessment/assessment-experience";
import { GapReportExperience } from "@/components/gap-report/gap-report-experience";
import { AppShell } from "@/components/layout/app-shell";
import { ProgressExperience } from "@/components/progress/progress-experience";
import { RevisionPlanner } from "@/components/revision/revision-planner";
import { TopicExplorer } from "@/components/topics/topic-explorer";

export type PreviewPageKind =
  | "topics"
  | "assessment"
  | "gaps"
  | "revision"
  | "assistant"
  | "progress";

const pageDetails: Record<PreviewPageKind, { title: string; heading: string; intro: string; icon: LucideIcon }> = {
  topics: { title: "Topic map", heading: "Explore your topic map", intro: "A sample view of connected subjects and their illustrative mastery states.", icon: GitBranch },
  assessment: { title: "Assessments", heading: "Diagnostic quiz preview", intro: "Try a short sample assessment. Answers are evaluated locally for demonstration only.", icon: BrainCircuit },
  gaps: { title: "Gap report", heading: "Knowledge gap report", intro: "Explore what a topic-level report can explain: what is known, what may be difficult, why, and a next step.", icon: FileText },
  revision: { title: "Revision plan", heading: "Your revision plan", intro: "Explore an example study schedule with topic priorities and evidence-based reasons.", icon: CalendarDays },
  assistant: { title: "Study assistant", heading: "Explain this topic", intro: "Explore a contextual learning-assistant preview connected to a sample topic and source.", icon: MessageCircle },
  progress: { title: "Progress", heading: "Your learning progress", intro: "Illustrative progress trends and assessment history for the demo experience.", icon: ChartNoAxesCombined },
};

const nextSteps: Record<PreviewPageKind, { href: string; label: string }> = {
  topics: { href: "/assessment", label: "Preview diagnostic assessment" },
  assessment: { href: "/gap-report", label: "Explore sample gap report" },
  gaps: { href: "/revision-plan", label: "Continue to revision plan" },
  revision: { href: "/assistant", label: "Explore study assistant" },
  assistant: { href: "/progress", label: "Review learning progress" },
  progress: { href: "/assessment", label: "Preview a new assessment" },
};

function PreviewContent({ kind }: { kind: PreviewPageKind }) {
  switch (kind) {
    case "topics":
      return <TopicExplorer />;
    case "assessment":
      return <AssessmentExperience />;
    case "gaps":
      return <GapReportExperience />;
    case "revision":
      return <RevisionPlanner />;
    case "assistant":
      return <AssistantExperience />;
    case "progress":
      return <ProgressExperience />;
  }
}

export function ProductPreviewPage({ kind }: { kind: PreviewPageKind }) {
  const details = pageDetails[kind];
  const Icon = details.icon;
  return (
    <AppShell title={details.title}>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow"><Icon aria-hidden="true" size={14} />{details.title}</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">{details.heading}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{details.intro}</p>
        </div>
        <Link className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm text-slate-200 transition hover:bg-white/[0.07]" href="/dashboard">Back to overview <ArrowRight aria-hidden="true" size={14} /></Link>
      </div>
      <PreviewContent kind={kind} />
      <div className="mt-6 flex flex-col justify-between gap-3 rounded-2xl border border-violet-200/10 bg-violet-200/[0.025] p-4 sm:flex-row sm:items-center">
        <p className="text-xs text-slate-400">Continue the student journey · all following screens remain prototype previews.</p>
        <Link className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-violet-300 px-4 text-xs font-semibold text-[#11101c] hover:bg-violet-200" href={nextSteps[kind].href}>{nextSteps[kind].label}<ArrowRight aria-hidden="true" size={13} /></Link>
      </div>
    </AppShell>
  );
}
