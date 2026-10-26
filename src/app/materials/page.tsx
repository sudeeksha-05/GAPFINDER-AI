import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { DatabaseSetupNotice } from "@/components/auth/database-setup-notice";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { DocumentLibrary } from "@/components/materials/document-library";
import { PageContainer } from "@/components/ui/page-container";
import { getMaxUploadBytes } from "@/lib/documents/config";
import { getOwnedDocuments } from "@/lib/documents/queries";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import {
  getWorkspaceData,
  WorkspaceSchemaNotReadyError,
} from "@/lib/supabase/workspace-data";
import { signOutAction } from "@/app/auth/actions";

export const instant = false;

export default async function MaterialsPage() {
  await connection();

  if (!getSupabasePublicConfig()) {
    return (
      <main className="site-shell flex min-h-screen max-w-3xl items-center py-12">
        <p className="w-full rounded-2xl border border-amber-200/20 bg-amber-200/[0.05] p-5 text-sm leading-6 text-amber-50">
          Supabase is not configured. Add the project URL and publishable key to <code>.env.local</code> before opening private materials.
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
  if (!workspace) redirect("/auth/sign-in?next=/materials");
  const documents = await getOwnedDocuments(workspace.userId);
  let maxUploadBytes: number;
  try {
    maxUploadBytes = getMaxUploadBytes();
  } catch (error) {
    return (
      <main className="site-shell flex min-h-screen max-w-3xl items-center py-12">
        <p className="w-full rounded-2xl border border-rose-200/15 bg-rose-200/[0.04] p-5 text-sm leading-6 text-rose-100" role="alert">
          {error instanceof Error ? error.message : "The document upload limit is misconfigured."}
        </p>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#080a12]">
      <AppSidebar />
      <div className="lg:pl-[252px]">
        <header className="flex min-h-[72px] items-center justify-between gap-4 border-b border-white/[0.07] px-4 sm:px-6 lg:px-9">
          <div>
            <p className="text-sm font-semibold text-white">My materials</p>
            <p className="hidden text-xs text-slate-500 sm:block">Private uploads · server-side processing</p>
          </div>
          <div className="flex items-center gap-3">
            <Link className="hidden text-xs text-slate-400 transition hover:text-white sm:block" href="/workspace/dashboard">
              Account workspace
            </Link>
            <span className="hidden max-w-48 truncate text-xs text-slate-500 md:block">{workspace.email}</span>
            <form action={signOutAction}>
              <button className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-200 transition hover:bg-white/[0.05]" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </header>
        <PageContainer>
          <main className="mt-7">
            <div className="mb-6">
              <p className="eyebrow">Your sources · private account data</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Your study materials</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Upload your own course files to extract searchable text and source-linked passages. Document data is never mixed with public demo content.
              </p>
            </div>
            <DocumentLibrary
              key={documents.map((document) => `${document.id}:${document.status}:${document.chunkCount}`).join("|")}
              initialDocuments={documents}
              maxUploadBytes={maxUploadBytes}
              subject={
                workspace.goal
                  ? { id: workspace.goal.subjectId, name: workspace.goal.subjectName }
                  : null
              }
            />
            <p className="mt-10 border-t border-white/[0.06] pt-5 text-xs text-slate-500">
              GapFinder AI · Private study materials · No quiz generation or AI answers are produced in this stage
            </p>
          </main>
        </PageContainer>
      </div>
    </div>
  );
}
