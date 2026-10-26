"use client";

import {
  BookOpen,
  ChartNoAxesColumnIncreasing,
  ChevronLeft,
  ClipboardCheck,
  Compass,
  FileText,
  Goal,
  LayoutDashboard,
  ListChecks,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/onboarding", label: "Study goals", icon: Goal },
  { href: "/materials", label: "My materials · private", icon: BookOpen },
  { href: "/topics", label: "Topic map", icon: Compass },
  { href: "/assessment", label: "Assessments", icon: ClipboardCheck },
  { href: "/gap-report", label: "Gap report", icon: FileText },
  { href: "/revision-plan", label: "Revision plan", icon: ListChecks },
  { href: "/assistant", label: "Study assistant", icon: MessageCircle },
  { href: "/progress", label: "Progress", icon: ChartNoAxesColumnIncreasing },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[252px] flex-col border-r border-white/[0.07] bg-[#0a0c15]/95 px-4 py-5 lg:flex">
        <Brand />
        <div className="mb-3 mt-9 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          Workspace
        </div>
        <nav aria-label="Dashboard navigation" className="flex flex-col gap-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition ${
                  active
                    ? "border border-violet-300/15 bg-violet-300/[0.1] text-violet-100"
                    : "text-slate-400 hover:bg-white/[0.04] hover:text-white"
                }`}
                href={href}
                key={href}
              >
                <Icon aria-hidden="true" size={17} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto rounded-2xl border border-violet-300/12 bg-gradient-to-br from-violet-300/[0.1] to-cyan-200/[0.04] p-4">
          <Sparkles aria-hidden="true" className="text-violet-200" size={18} />
          <p className="mt-3 text-sm font-medium text-white">Your next step starts here.</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">Personalized learning tools are coming soon.</p>
        </div>
        <Link className="mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-400 hover:text-white" href="/">
          <ChevronLeft aria-hidden="true" size={15} />
          Back to GapFinder
        </Link>
      </aside>

      <nav aria-label="Mobile dashboard navigation" className="flex gap-2 overflow-x-auto border-b border-white/[0.07] px-4 py-2 lg:hidden">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-xs ${
                active ? "bg-violet-300/15 text-violet-100" : "text-slate-400 hover:bg-white/5"
              }`}
              href={href}
              key={href}
            >
              <Icon aria-hidden="true" size={14} />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

export function Brand() {
  return (
    <Link aria-label="GapFinder AI home" className="flex items-center gap-2.5 px-2" href="/">
      <span className="flex size-9 items-center justify-center rounded-xl border border-violet-300/20 bg-violet-300/10 text-violet-200">
        <Sparkles aria-hidden="true" size={18} />
      </span>
      <span className="text-sm font-semibold tracking-tight text-white">
        GapFinder <span className="text-violet-300">AI</span>
      </span>
    </Link>
  );
}
