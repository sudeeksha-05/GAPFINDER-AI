"use client";

import { Bell, ChevronDown } from "lucide-react";
import { useStudyDemo } from "@/components/study-demo-provider";
import { SUBJECT_OPTIONS } from "@/lib/demo-data";

export function AppHeader({ title }: { title: string }) {
  const { goal, setSubject } = useStudyDemo();

  return (
    <header className="flex min-h-[72px] items-center justify-between gap-4 border-b border-white/[0.07] px-4 sm:px-6 lg:px-9">
      <div className="flex items-center gap-3">
        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="hidden text-xs text-slate-500 sm:block">Your personal learning space</p>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        <label className="sr-only" htmlFor="active-demo-subject">Active demo subject</label>
        <select
          className="max-w-32 rounded-lg border border-white/[0.08] bg-[#0b0e18] px-2 py-2 text-[10px] text-slate-200 outline-none focus:border-violet-300/50 sm:max-w-44 sm:px-3 sm:text-xs"
          id="active-demo-subject"
          onChange={(event) => {
            const subject = SUBJECT_OPTIONS.find((option) => option.id === event.target.value);
            if (subject) setSubject(subject.id);
          }}
          value={goal.subjectId}
        >
          {SUBJECT_OPTIONS.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
        </select>
        <span className="rounded-full border border-violet-300/15 bg-violet-300/[0.07] px-2.5 py-1 text-[10px] font-semibold tracking-wider text-violet-100 sm:text-xs">
          DEMO
        </span>
        <button aria-label="Notifications are not available in this demo" className="hidden size-9 cursor-not-allowed items-center justify-center rounded-xl border border-white/[0.07] text-slate-500 sm:flex" disabled>
          <Bell aria-hidden="true" size={16} />
        </button>
        <button aria-label="Profile settings are coming soon" className="flex cursor-not-allowed items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] py-1 pl-1 pr-2 text-left" disabled>
          <span className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-300/30 to-cyan-200/20 text-[10px] font-semibold text-white">GF</span>
          <span className="hidden text-xs text-slate-300 sm:inline">Student</span>
          <ChevronDown aria-hidden="true" className="hidden text-slate-500 sm:block" size={13} />
        </button>
      </div>
    </header>
  );
}
