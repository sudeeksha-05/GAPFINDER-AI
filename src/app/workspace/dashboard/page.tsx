import Link from "next/link";
import { ArrowRight, BookOpen, CalendarDays, Clock3, Target } from "lucide-react";
import { connection } from "next/server";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import {
  getWorkspaceData,
  WorkspaceSchemaNotReadyError,
} from "@/lib/supabase/workspace-data";
import { DatabaseSetupNotice } from "@/components/auth/database-setup-notice";

export default async function WorkspaceDashboardPage() {
  await connection();

  if (!getSupabasePublicConfig()) {
    return (
      <p className="rounded-2xl border border-amber-200/20 bg-amber-200/[0.05] p-5 text-sm leading-6 text-amber-50">
        Supabase is not configured. Add the project URL and publishable key to <code>.env.local</code> before opening the private workspace.
      </p>
    );
  }
  let workspace;
  try {
    workspace = await getWorkspaceData();
  } catch (error) {
    if (error instanceof WorkspaceSchemaNotReadyError) {
      return <DatabaseSetupNotice />;
    }
    throw error;
  }
  if (!workspace) return null;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Private student workspace</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">
            Welcome{workspace.displayName ? `, ${workspace.displayName}` : ""}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            This account area displays saved records only. Demo preview scores are kept separate.
          </p>
        </div>
        <span className="rounded-full border border-emerald-200/15 bg-emerald-200/[0.05] px-3 py-1.5 text-[10px] font-semibold tracking-[0.14em] text-emerald-100">
          ACCOUNT DATA
        </span>
      </div>

      {workspace.goal ? (
        <section className="surface-card mt-8 rounded-3xl p-5 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Active study goal</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                {workspace.goal.examName || workspace.goal.subjectName}
              </h2>
              <p className="mt-1 text-sm text-slate-400">{workspace.goal.subjectName}</p>
            </div>
            <Link className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm text-slate-200 transition hover:bg-white/[0.04]" href="/onboarding">
              Edit goal <ArrowRight aria-hidden="true" size={15} />
            </Link>
          </div>
          <dl className="mt-7 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
              <dt className="flex items-center gap-2 text-xs text-slate-400"><CalendarDays aria-hidden="true" size={14} /> Target date</dt>
              <dd className="mt-2 text-sm font-medium text-white">{new Date(`${workspace.goal.examDate}T12:00:00`).toLocaleDateString()}</dd>
            </div>
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
              <dt className="flex items-center gap-2 text-xs text-slate-400"><Clock3 aria-hidden="true" size={14} /> Daily availability</dt>
              <dd className="mt-2 text-sm font-medium text-white">{workspace.goal.dailyMinutes} minutes</dd>
            </div>
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
              <dt className="flex items-center gap-2 text-xs text-slate-400"><Target aria-hidden="true" size={14} /> Session preference</dt>
              <dd className="mt-2 text-sm font-medium text-white">{workspace.goal.sessionDuration} minutes</dd>
            </div>
          </dl>
          <div className="mt-6">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-white"><BookOpen aria-hidden="true" size={16} /> Prioritized topics</h3>
            {workspace.goal.topics.length ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {workspace.goal.topics.map((topic) => (
                  <li className="rounded-full border border-violet-200/15 bg-violet-200/[0.06] px-3 py-1.5 text-xs text-violet-100" key={topic.id}>{topic.name}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-slate-400">No priority topics selected. Your goal covers the full subject.</p>
            )}
          </div>
        </section>
      ) : (
        <section className="surface-card mt-8 rounded-3xl p-6 sm:p-9">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-violet-300/[0.1] text-violet-100"><Target aria-hidden="true" size={21} /></div>
          <h2 className="mt-5 text-2xl font-semibold text-white">Set up your first study goal</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
            Save a subject, topic priorities, target date, and available study time. These settings are private to your account.
          </p>
          <Link className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-violet-300 px-5 text-sm font-semibold text-[#11101c] transition hover:bg-violet-200" href="/onboarding">
            Create study goal <ArrowRight aria-hidden="true" size={15} />
          </Link>
        </section>
      )}

      <p className="mt-6 rounded-2xl border border-cyan-200/10 bg-cyan-200/[0.03] p-4 text-xs leading-5 text-slate-400">
        No quizzes, mastery results, reports, AI responses, or revision schedules are generated yet. The public demo routes contain illustrative sample content only.
      </p>
    </div>
  );
}
