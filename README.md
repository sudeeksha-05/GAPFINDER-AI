# GapFinder AI

GapFinder AI is a learning product prototype focused on helping students
understand topic-level knowledge gaps and choose a useful next study step.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Supabase setup

Authentication, private account study goals, document storage, and retrieval
use Supabase Auth/PostgreSQL/Storage. They do not connect until a project and
server-only credentials are configured.

1. Create a Supabase project and copy `.env.example` to `.env.local`.
2. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and
  `NEXT_PUBLIC_SITE_URL` to your project URL, publishable key, and app origin.
  Set `SUPABASE_SERVICE_ROLE_KEY` only in the server environment; it is used by
  authenticated server handlers for privileged, owner-checked document RPCs and
  must never be exposed in browser code.
3. In the Supabase Auth URL configuration, set the Site URL to the app origin
  and allow the redirect URL `<app-origin>/auth/callback`.
4. Apply all files in `supabase/migrations/` in filename order, using the
  Supabase CLI (`supabase db push`) or SQL editor. The second migration adds
  document processing, vector-search functions, owner-read policies, and
  server-only write RPCs. The third adds atomic server-side quiz submission
  and grading using the existing attempt and response tables.
5. The migrations create a private `study-materials` bucket with a 50 MB
  platform cap and PDF/TXT/DOCX allowlist. The app defaults to a 15 MB upload
  limit; optionally set `DOCUMENT_MAX_UPLOAD_BYTES` to 1 KB–50 MB. PDF
  extraction is limited to 1,000 pages and processing to 600 chunks per
  document; split larger files before uploading.
6. Set `OPENAI_API_KEY` only on the server. It is used to call OpenAI's
  `text-embedding-3-small` embedding endpoint; its output dimension is fixed at
  1536 to match the `extensions.vector(1536)` database column. Extracted chunk
  text is sent to this provider when embeddings are generated.
7. Optionally configure `DOCUMENT_MAX_UPLOAD_BYTES`; restart Next.js after
  setting environment variables. Create a real test
  account using `/auth/sign-up`; when email confirmations are enabled, confirm
  the address before signing in.

For a local Supabase stack, install and run the Supabase CLI, then use
`supabase start` and `supabase db reset` from the project root. Run the
database ownership checks with `supabase test db`. These commands require the
Supabase CLI and Docker. The SQL test creates temporary test users inside a
rolled-back transaction; no sample password or pre-created demo account is
provided.

Set `NEXT_PUBLIC_SITE_URL` to the exact origin registered with Supabase when
deploying. Password reset and signup confirmation links both return through
`/auth/callback`.

### Data boundaries

- `/workspace/dashboard`, protected `/onboarding`, and protected `/materials`
  are backed by authenticated Supabase records and verified server sessions.
- `/dashboard`, `/topics`, `/assessment`, `/gap-report`,
 `/revision-plan`, `/assistant`, and `/progress` remain public, clearly labeled
 illustrative previews. Their sample scores and interactions are not private
 user records or results from AI.
- PDF selectable text, UTF-8 TXT, and DOCX can be extracted on the server.
 Documents are chunked with overlap and stored with their embeddings and
 page/source metadata. OCR for scanned PDFs is not available.
- Ingestion saves embedded chunks in batches and reuses matching content hashes
 on retry. A document is marked ready only after all chunks and embeddings are
 stored. Incomplete chunks on a failed job remain owner-private and are
 replaced or removed during a retry/completion.
- `retrieveStudyEvidence` in `src/lib/documents/retrieval.ts` is a server-only
 semantic search service. It derives ownership from the verified session, then
 searches with a database function that repeats owner, subject, document, and
 topic filters. Results include source passages and attribution; insufficient
 matches are returned explicitly. It does not generate answers or quizzes.
- Document processing, chunk writes, deletion, and vector search use
 service-role-only RPC execution. The app verifies the user's session before
 passing that owner's ID to the server-only database client; browser clients
 cannot call the privileged functions or write document/chunk tables.
- `/assessment` can generate source-grounded multiple-choice questions from the
  signed-in student's processed, subject-scoped materials. Questions and private
  answer keys are saved to the existing quiz schema; answer keys are not returned
  before submission. Authenticated quiz submission and server-side grading save
  attempts and per-question responses. The answer key remains inaccessible to
  browser roles; a privileged RPC locks the owner-scoped quiz and returns
  explanations and citations only after grading.
- The `quiz_question_keys` table is revoked from `anon` and `authenticated`
 clients and has no user-facing RLS policy. Future grading must run in a
 trusted server-side boundary.
- Document embeddings use `extensions.vector(1536)` and
 `text-embedding-3-small`; records with another model/dimension are excluded
 from retrieval.
- User-owned rows have RLS. Private Storage objects are placed under a
 first path segment equal to the authenticated user's UUID.

The Supabase integration cannot be considered connected until project
credentials are configured, both migrations are applied, and the private
Storage bucket is available. Database/RLS tests must be run against the local
Supabase stack or another configured project.

If the account workspace reports that `public.profiles` is missing from the
schema cache, the Supabase project has not applied the initial schema migration
or its PostgREST schema cache has not refreshed. Confirm the CLI is linked to
the intended project, run `supabase db push`, then refresh the workspace. Do not
create the account tables manually or substitute demo data for private records.

If saving a study goal reports `study_goals_user_id_fkey`, the signed-in auth
account may predate the profile-creation trigger. The
`20261026020000_backfill_existing_profiles.sql` migration creates missing
profiles for existing auth users without changing existing profile rows. Apply
pending migrations with `npx supabase db push --linked`, then retry saving the
goal.

## Prototype routes

- `/` — product landing page and sample report entry point.
- `/auth/sign-up`, `/auth/sign-in` — Supabase account creation and sign-in.
- `/auth/forgot-password`, `/auth/update-password` — password recovery.
- `/workspace/dashboard` — authenticated profile and persisted study goal.
- `/onboarding` — authenticated study-goal setup; saves subject, topic priorities,
 exam date, daily availability, and preferred session duration.
- `/dashboard` — illustrative learner overview and charts.
- `/materials` — protected private file upload, processing status, retry, and
  deletion.
- `/topics` — expandable syllabus topic and source map.
- `/assessment` — source-grounded quiz generation and authenticated submission
  for students with processed uploads, alongside the separate illustrative
  sample quiz.
- `/gap-report` — topic-level illustrative evidence and recommended next steps.
- `/revision-plan` — interactive session checklist and rescheduling preview.
- `/assistant` — contextual sample prompts and clearly labeled example response.
- `/progress` — illustrative topic history and assessment trend.

All sample scores, topic states, histories, source references, and schedules are
demo content. Quiz responses and revision checklists remain local preview
interactions. The authenticated study goal and real uploaded files are separate
private records.

## Available checks

```bash
npm run lint
npm test
npm run build
```

For database policy tests (requires Supabase CLI and Docker):

```bash
supabase test db
```

## Project structure

- `src/app/` — App Router routes, auth actions, account workspace, metadata, and
 global styles.
- `src/components/layout/` — marketing and demo application navigation.
- `src/components/landing/` — product narrative and landing-page sections.
- `src/components/dashboard/` — illustrative demo dashboard visualizations.
- `src/components/onboarding/`, `materials/`, `topics/`, `assessment/`,
 `gap-report/`, `revision/`, `assistant/`, and `progress/` — public prototype
 flows.
- `src/lib/demo-data.ts` — typed public illustrative dataset.
- `src/lib/supabase/` — Supabase SSR clients and authenticated workspace reads.
- `src/lib/documents/` — server-only extraction, chunking, embedding, retry, and
  retrieval services plus validation tests.
- `supabase/migrations/` — versioned PostgreSQL schema, RLS, and Storage setup.
- `supabase/tests/database/` — database ownership test procedure.

The project uses Next.js App Router, TypeScript strict mode, Tailwind CSS v4,
and the `@/*` alias for imports from `src/`.
