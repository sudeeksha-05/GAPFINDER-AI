"use client";

import { ArrowUpRight, Menu, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const navigation = [
  { href: "#product", label: "Product" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "/gap-report", label: "Sample report" },
  { href: "/dashboard", label: "Demo mode" },
];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="site-shell relative z-30 border-b border-white/[0.06]">
      <div className="flex min-h-[76px] items-center justify-between gap-5">
        <Link aria-label="GapFinder AI home" className="inline-flex shrink-0 items-center gap-2.5 rounded-lg" href="/">
          <span className="flex size-9 items-center justify-center rounded-xl border border-violet-300/20 bg-violet-300/10 text-violet-200">
            <Sparkles aria-hidden="true" size={18} />
          </span>
          <span className="text-[0.98rem] font-semibold tracking-tight">
            GapFinder <span className="text-violet-300">AI</span>
          </span>
        </Link>

        <nav aria-label="Main navigation" className="hidden items-center gap-8 md:flex">
          {navigation.map((item) => item.href.startsWith("#") ? (
            <a className="rounded-md text-sm text-slate-300 transition-colors hover:text-white" href={item.href} key={item.href}>{item.label}</a>
          ) : (
            <Link className="rounded-md text-sm text-slate-300 transition-colors hover:text-white" href={item.href} key={item.href}>{item.label}</Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-violet-300/30 bg-violet-300/10 px-3.5 py-1.5 text-xs font-semibold text-violet-200 transition hover:bg-violet-300/20" href="/dashboard">
            <Sparkles aria-hidden="true" size={14} /> Demo mode
          </Link>
          <Link className="rounded-md px-3 py-2 text-sm text-slate-300 transition hover:text-white" href="/auth/sign-in">Sign in</Link>
          <Link className="inline-flex min-h-10 items-center gap-2 rounded-full bg-violet-300 px-4 text-sm font-semibold text-[#11101c] transition hover:bg-violet-200" href="/auth/sign-up">
            Get started <ArrowUpRight aria-hidden="true" size={15} />
          </Link>
        </div>

        <button
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          className="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-100 md:hidden"
          onClick={() => setMenuOpen((open) => !open)}
          type="button"
        >
          {menuOpen ? <X aria-hidden="true" size={19} /> : <Menu aria-hidden="true" size={19} />}
        </button>
      </div>

      {menuOpen && (
        <nav aria-label="Mobile navigation" className="absolute inset-x-0 top-[calc(100%-1px)] rounded-b-2xl border border-white/10 bg-[#0e111c] p-4 shadow-2xl md:hidden">
          <div className="flex flex-col gap-1">
            {navigation.map((item) => item.href.startsWith("#") ? (
              <a className="rounded-xl px-3 py-3 text-sm text-slate-200 hover:bg-white/[0.05]" href={item.href} key={item.href} onClick={() => setMenuOpen(false)}>{item.label}</a>
            ) : (
              <Link className="rounded-xl px-3 py-3 text-sm text-slate-200 hover:bg-white/[0.05]" href={item.href} key={item.href} onClick={() => setMenuOpen(false)}>{item.label}</Link>
            ))}
            <div className="my-2 h-px bg-white/[0.07]" />
            <Link className="rounded-xl px-3 py-3 text-sm text-slate-200 hover:bg-white/[0.05]" href="/auth/sign-in" onClick={() => setMenuOpen(false)}>Sign in</Link>
            <Link className="mt-1 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-violet-300 px-4 text-sm font-semibold text-[#11101c]" href="/auth/sign-up" onClick={() => setMenuOpen(false)}>Get started <ArrowUpRight aria-hidden="true" size={15} /></Link>
          </div>
        </nav>
      )}
    </header>
  );
}
