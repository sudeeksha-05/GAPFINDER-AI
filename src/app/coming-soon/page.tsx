import { ArrowLeft, Clock3, Sparkles } from "lucide-react";
import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export default function ComingSoonPage() {
  return (
    <>
      <SiteHeader />
      <main className="site-shell flex min-h-[70vh] items-center justify-center py-16">
        <section className="surface-card w-full max-w-xl rounded-3xl p-7 text-center sm:p-10">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-violet-200/15 bg-violet-200/[0.08] text-violet-100"><Sparkles aria-hidden="true" size={24} /></span>
          <p className="eyebrow mt-6 justify-center"><Clock3 aria-hidden="true" size={14} />Coming soon</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">Accounts are not ready yet.</h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-slate-400">Sign-in and account features are not implemented in this stage. You can explore the illustrative demo dashboard without creating an account.</p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-violet-300 px-5 text-sm font-semibold text-[#11101c] transition hover:bg-violet-200" href="/dashboard">Explore demo dashboard</Link>
            <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/10 px-5 text-sm text-slate-200 transition hover:bg-white/[0.05]" href="/"><ArrowLeft aria-hidden="true" size={15} />Back home</Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
