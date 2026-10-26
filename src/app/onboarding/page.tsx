import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import {
  getWorkspaceData,
  WorkspaceSchemaNotReadyError,
} from "@/lib/supabase/workspace-data";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { DatabaseSetupNotice } from "@/components/auth/database-setup-notice";
import { SUBJECT_OPTIONS, type StudyGoal } from "@/lib/demo-data";

export const instant = false;

export default async function OnboardingPage() {
  await connection();

  if (!getSupabasePublicConfig()) {
    return (
      <main className="site-shell flex min-h-screen max-w-3xl items-center py-12">
        <p className="w-full rounded-2xl border border-amber-200/20 bg-amber-200/[0.05] p-5 text-sm leading-6 text-amber-50">
          Supabase is not configured. Add the project URL and publishable key to <code>.env.local</code> before setting up an account study goal.
        </p>
      </main>
    );
  }
  let workspace;
  try {
    workspace = await getWorkspaceData();
  } catch (error) {
    if (error instanceof WorkspaceSchemaNotReadyError) {
      return (
        <main className="site-shell flex min-h-screen items-center py-12">
          <DatabaseSetupNotice />
        </main>
      );
    }
    throw error;
  }
  if (!workspace) return null;
  const selectedSubject = SUBJECT_OPTIONS.find((subject) => subject.id === workspace.goal?.subjectId);
  const initialGoal: StudyGoal | undefined =
    workspace.goal && selectedSubject
      ? {
          subjectId: selectedSubject.id,
          examName: workspace.goal.examName ?? "",
          examDate: workspace.goal.examDate,
          dailyMinutes: workspace.goal.dailyMinutes,
          sessionDuration: workspace.goal.sessionDuration,
          selectedTopicIds: workspace.goal.topics.map((topic) => topic.id),
        }
      : undefined;

  return (
    <main className="min-h-screen px-4 pb-12 pt-6 sm:px-6">
      <div className="mx-auto mb-10 flex max-w-3xl items-center justify-between">
        <Link className="text-sm font-semibold text-white" href="/">GapFinder <span className="text-violet-300">AI</span></Link>
        <Link className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white" href="/"><ArrowLeft aria-hidden="true" size={14} />Back to home</Link>
      </div>
      <div className="mx-auto mb-8 max-w-3xl text-center">
        <p className="eyebrow justify-center">A few quick details</p>
        <p className="mt-2 text-sm text-slate-400">Your selections are validated and saved to your private account.</p>
      </div>
      <OnboardingFlow initialGoal={initialGoal} />
    </main>
  );
}
