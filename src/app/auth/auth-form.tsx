"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { AuthActionState } from "@/app/auth/actions";

type AuthFormProps = {
  title: string;
  description: string;
  action: (
    state: AuthActionState,
    formData: FormData,
  ) => Promise<AuthActionState>;
  fields: Array<{
    name: string;
    label: string;
    type: "email" | "password" | "text";
    autoComplete: string;
  }>;
  submitLabel: string;
  links?: Array<{ label: string; href: string }>;
  hiddenNext?: string;
  disabledReason?: string;
};

const initialState: AuthActionState = { message: "" };

export function AuthForm({
  title,
  description,
  action,
  fields,
  submitLabel,
  links = [],
  hiddenNext,
  disabledReason,
}: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <main className="site-shell flex min-h-screen max-w-lg items-center py-12">
      <section className="surface-card w-full rounded-3xl p-6 sm:p-9">
        <Link className="text-sm font-semibold text-white" href="/">
          GapFinder <span className="text-violet-300">AI</span>
        </Link>
        <p className="eyebrow mt-8">Student account</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
        {disabledReason ? (
          <p className="mt-7 rounded-xl border border-amber-200/20 bg-amber-200/[0.05] p-4 text-sm leading-6 text-amber-50" role="status">
            {disabledReason}
          </p>
        ) : null}
        <form action={formAction} className={`mt-7 space-y-4 ${disabledReason ? "hidden" : ""}`}>
          {hiddenNext ? <input name="next" type="hidden" value={hiddenNext} /> : null}
          {fields.map((field) => (
            <label className="block text-sm font-medium text-slate-200" key={field.name}>
              {field.label}
              <input
                autoComplete={field.autoComplete}
                className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-[#0b0e18] px-4 text-sm text-white outline-none focus:border-violet-300/50 focus:ring-2 focus:ring-violet-300/10"
                name={field.name}
                required
                type={field.type}
              />
            </label>
          ))}
          {state.message ? (
            <p
              aria-live="polite"
              className={`rounded-xl border p-3 text-sm leading-6 ${state.error ? "border-rose-300/20 bg-rose-300/[0.05] text-rose-100" : "border-cyan-200/15 bg-cyan-200/[0.04] text-cyan-50"}`}
              role={state.error ? "alert" : "status"}
            >
              {state.message}
            </p>
          ) : null}
          <button
            className="min-h-12 w-full rounded-xl bg-violet-300 px-5 text-sm font-semibold text-[#11101c] transition hover:bg-violet-200 disabled:cursor-wait disabled:opacity-60"
            disabled={pending}
            type="submit"
          >
            {pending ? "Please wait..." : submitLabel}
          </button>
        </form>
        {links.length > 0 ? (
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-400">
            {links.map((link) => (
              <Link className="transition hover:text-violet-100" href={link.href} key={link.href}>
                {link.label}
              </Link>
            ))}
          </div>
        ) : null}
        <p className="mt-7 border-t border-white/[0.07] pt-5 text-xs leading-5 text-slate-500">
          Account and study-goal data is private to your account. Product previews remain
          illustrative and are not assessment results.
        </p>
      </section>
    </main>
  );
}
