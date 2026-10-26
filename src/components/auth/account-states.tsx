"use client";

export function AccountErrorState({ reset }: { reset: () => void }) {
  return (
    <section className="surface-card mx-auto max-w-3xl rounded-3xl p-6 sm:p-9">
      <p className="eyebrow">Account data unavailable</p>
      <h1 className="mt-2 text-2xl font-semibold text-white">We could not load your saved information.</h1>
      <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
        Your account data has not been replaced with sample content. Check the Supabase connection and try again.
      </p>
      <button
        className="mt-6 min-h-11 rounded-xl border border-white/10 px-4 text-sm text-slate-100 transition hover:bg-white/[0.05]"
        onClick={reset}
        type="button"
      >
        Try again
      </button>
    </section>
  );
}

export function AccountLoadingState() {
  return (
    <div aria-label="Loading account data" className="mx-auto max-w-5xl animate-pulse space-y-5" role="status">
      <div className="h-8 w-56 rounded-lg bg-white/[0.06]" />
      <div className="surface-card h-64 rounded-3xl" />
      <span className="sr-only">Loading your private account information.</span>
    </div>
  );
}
