import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { signOutAction } from "@/app/auth/actions";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const links = [
  { href: "/workspace/dashboard", label: "Overview" },
  { href: "/onboarding", label: "Study goals" },
];

export const instant = false;

export default async function WorkspaceLayout({
  children,
}: LayoutProps<"/workspace">) {
  await connection();

  if (!getSupabasePublicConfig()) {
    return (
      <main className="site-shell flex min-h-screen max-w-3xl items-center py-12">
        <p className="w-full rounded-2xl border border-amber-200/20 bg-amber-200/[0.05] p-5 text-sm leading-6 text-amber-50">
          Supabase is not configured. Add the project URL and publishable key to <code>.env.local</code> before opening the private workspace.
        </p>
      </main>
    );
  }
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw new Error(`Could not verify your session: ${error.message}`);
  if (!user) redirect("/auth/sign-in");

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/[0.07] bg-[#0b0e18]/80">
        <div className="site-shell flex min-h-[72px] items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link className="text-sm font-semibold text-white" href="/">
              GapFinder <span className="text-violet-300">AI</span>
            </Link>
            <nav aria-label="Account navigation" className="hidden items-center gap-4 sm:flex">
              {links.map((link) => (
                <Link className="text-xs text-slate-400 transition hover:text-white" href={link.href} key={link.href}>
                  {link.label}
                </Link>
              ))}
              <Link className="text-xs text-slate-400 transition hover:text-white" href="/dashboard">
                Demo preview
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden max-w-48 truncate text-xs text-slate-400 sm:inline">{user.email}</span>
            <form action={signOutAction}>
              <button className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-200 transition hover:bg-white/[0.05]" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="site-shell py-8 sm:py-12">{children}</main>
    </div>
  );
}
