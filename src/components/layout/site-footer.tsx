import { Sparkles } from "lucide-react";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-shell mt-16 border-t border-white/[0.07] py-8 text-sm text-slate-400">
      <div className="flex flex-col gap-7 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link aria-label="GapFinder AI home" className="inline-flex w-fit items-center gap-2 font-medium text-slate-200" href="/">
            <Sparkles aria-hidden="true" className="text-violet-300" size={16} />GapFinder AI
          </Link>
          <p className="mt-2 text-xs text-slate-500">Discover What You Don&apos;t Know.</p>
        </div>
        <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-5 gap-y-3 text-xs">
          <Link className="hover:text-white" href="/dashboard">Dashboard preview</Link>
          <Link className="hover:text-white" href="/onboarding">Study goals</Link>
          <Link className="hover:text-white" href="/#how-it-works">How it works</Link>
          <Link className="hover:text-white" href="/#features">Features</Link>
          <Link className="hover:text-white" href="/coming-soon?feature=sign-in">Sign in · coming soon</Link>
        </nav>
      </div>
      <div className="mt-7 flex flex-col gap-2 border-t border-white/[0.06] pt-5 text-[11px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <p>Product interface preview — no live assessment or AI functionality.</p>
        <p>© 2026 GapFinder AI · Illustrative demo data</p>
      </div>
    </footer>
  );
}
