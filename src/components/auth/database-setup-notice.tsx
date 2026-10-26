export function DatabaseSetupNotice() {
  return (
    <section
      className="surface-card mx-auto max-w-3xl rounded-3xl border border-amber-200/15 p-6 sm:p-9"
      role="alert"
    >
      <p className="eyebrow">Supabase setup required</p>
      <h1 className="mt-2 text-2xl font-semibold text-white">
        The application database schema is not available.
      </h1>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        GapFinder AI could not find its account tables, including{" "}
        <code className="text-amber-100">public.profiles</code>. No sample data
        has been substituted for your account information.
      </p>
      <p className="mt-4 text-sm leading-6 text-slate-300">
        From the project root, link the Supabase project if needed, then apply
        the checked-in migrations with{" "}
        <code className="rounded bg-white/[0.06] px-1.5 py-1 text-violet-100">
          supabase db push
        </code>
        . Apply{" "}
        <code className="text-violet-100">
          20260602000000_initial_schema.sql
        </code>{" "}
        before{" "}
        <code className="text-violet-100">
          20261026000000_document_ingestion_and_retrieval.sql
        </code>
        . Then refresh this page.
      </p>
    </section>
  );
}
