create extension if not exists vector with schema extensions;

create type public.document_category as enum (
  'lecture_notes',
  'textbook',
  'slides',
  'syllabus',
  'other'
);
create type public.processing_status as enum (
  'uploaded',
  'queued',
  'processing',
  'ready',
  'failed'
);
create type public.question_type as enum (
  'multiple_choice',
  'short_answer',
  'true_false',
  'worked_problem'
);
create type public.assessment_difficulty as enum ('beginner', 'intermediate', 'advanced');
create type public.quiz_attempt_status as enum ('in_progress', 'submitted', 'evaluated', 'abandoned');
create type public.quiz_status as enum ('draft', 'ready', 'failed');
create type public.revision_session_status as enum ('scheduled', 'completed', 'missed', 'skipped');
create type public.chat_message_role as enum ('user', 'assistant');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length check (char_length(display_name) <= 80)
);

create table public.subjects (
  id text primary key,
  name text not null unique,
  description text not null default '',
  created_at timestamptz not null default now()
);

create table public.topics (
  id text primary key,
  subject_id text not null references public.subjects(id) on delete cascade,
  parent_topic_id text,
  name text not null,
  description text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (id, subject_id),
  foreign key (parent_topic_id, subject_id)
    references public.topics(id, subject_id) on delete cascade
);
create index topics_subject_order_idx on public.topics(subject_id, sort_order);

create table public.study_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject_id text not null references public.subjects(id) on delete restrict,
  exam_name text,
  exam_date date not null,
  daily_minutes integer not null check (daily_minutes between 10 and 1440),
  preferred_session_duration integer not null
    check (preferred_session_duration between 10 and 180),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (id, user_id, subject_id),
  constraint study_goals_exam_name_length check (
    exam_name is null or char_length(exam_name) <= 120
  )
);
create unique index study_goals_one_active_per_user_idx
  on public.study_goals(user_id) where is_active;
create index study_goals_user_updated_idx on public.study_goals(user_id, updated_at desc);

create table public.topic_priorities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  study_goal_id uuid not null,
  subject_id text not null,
  topic_id text not null,
  priority smallint not null default 1 check (priority between 1 and 5),
  created_at timestamptz not null default now(),
  unique (study_goal_id, topic_id),
  foreign key (study_goal_id, user_id, subject_id)
    references public.study_goals(id, user_id, subject_id) on delete cascade,
  foreign key (topic_id, subject_id)
    references public.topics(id, subject_id) on delete restrict
);
create index topic_priorities_user_goal_idx on public.topic_priorities(user_id, study_goal_id);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  study_goal_id uuid,
  category public.document_category not null default 'other',
  storage_path text not null unique,
  original_filename text not null,
  mime_type text not null,
  file_size_bytes bigint not null check (file_size_bytes > 0),
  processing_status public.processing_status not null default 'uploaded',
  extraction_error text,
  uploaded_at timestamptz not null default now(),
  processed_at timestamptz,
  constraint documents_id_user_unique unique (id, user_id),
  foreign key (study_goal_id, user_id)
    references public.study_goals(id, user_id) on delete set null (study_goal_id)
);
create index documents_user_uploaded_idx on public.documents(user_id, uploaded_at desc);
create index documents_user_status_idx on public.documents(user_id, processing_status);

create table public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  document_id uuid not null,
  chunk_index integer not null check (chunk_index >= 0),
  page_number integer check (page_number is null or page_number > 0),
  section_heading text,
  extracted_text text not null,
  source_reference text,
  embedding extensions.vector(1536),
  created_at timestamptz not null default now(),
  unique (document_id, chunk_index),
  unique (id, user_id),
  foreign key (document_id, user_id)
    references public.documents(id, user_id) on delete cascade
);
create index document_chunks_user_document_idx on public.document_chunks(user_id, document_id);

create table public.topic_source_mappings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  document_id uuid not null,
  chunk_id uuid,
  topic_id text not null references public.topics(id) on delete cascade,
  confidence numeric(5, 4) check (confidence is null or confidence between 0 and 1),
  created_at timestamptz not null default now(),
  foreign key (document_id, user_id)
    references public.documents(id, user_id) on delete cascade,
  foreign key (chunk_id, user_id)
    references public.document_chunks(id, user_id) on delete cascade
);
create index topic_source_mappings_user_topic_idx
  on public.topic_source_mappings(user_id, topic_id);

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  study_goal_id uuid,
  subject_id text not null references public.subjects(id) on delete restrict,
  title text not null,
  status public.quiz_status not null default 'ready',
  created_at timestamptz not null default now(),
  unique (id, user_id),
  unique (id, user_id, subject_id),
  foreign key (study_goal_id, user_id, subject_id)
    references public.study_goals(id, user_id, subject_id) on delete set null (study_goal_id)
);
create index quizzes_user_created_idx on public.quizzes(user_id, created_at desc);

create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  quiz_id uuid not null,
  subject_id text not null,
  topic_id text not null,
  subtopic_id text,
  question_type public.question_type not null,
  difficulty public.assessment_difficulty not null,
  prompt text not null,
  choices text[],
  source_chunk_id uuid,
  source_reference text,
  question_order integer not null check (question_order >= 0),
  created_at timestamptz not null default now(),
  unique (id, user_id),
  unique (id, user_id, quiz_id),
  unique (quiz_id, question_order),
  foreign key (quiz_id, user_id, subject_id)
    references public.quizzes(id, user_id, subject_id) on delete cascade,
  foreign key (topic_id, subject_id)
    references public.topics(id, subject_id) on delete restrict,
  foreign key (subtopic_id, subject_id)
    references public.topics(id, subject_id) on delete restrict,
  foreign key (source_chunk_id, user_id)
    references public.document_chunks(id, user_id) on delete set null (source_chunk_id)
);
create index quiz_questions_user_quiz_idx on public.quiz_questions(user_id, quiz_id);

create table public.quiz_question_keys (
  question_id uuid primary key,
  quiz_id uuid not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  answer_key text not null,
  grading_rubric text,
  created_at timestamptz not null default now(),
  constraint quiz_question_keys_question_quiz_fkey
    foreign key (question_id, user_id, quiz_id)
    references public.quiz_questions(id, user_id, quiz_id) on delete cascade
);
alter table public.quiz_question_keys enable row level security;
revoke all on public.quiz_question_keys from anon, authenticated;

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  quiz_id uuid not null,
  subject_id text not null,
  status public.quiz_attempt_status not null default 'in_progress',
  score numeric(7, 2) check (score is null or score >= 0),
  max_score numeric(7, 2) check (max_score is null or max_score > 0),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  evaluated_at timestamptz,
  unique (id, user_id),
  unique (id, user_id, quiz_id),
  unique (id, user_id, subject_id),
  foreign key (quiz_id, user_id, subject_id)
    references public.quizzes(id, user_id, subject_id) on delete cascade,
  constraint quiz_attempt_score_within_max check (
    score is null or max_score is null or score <= max_score
  )
);
create index quiz_attempts_user_started_idx on public.quiz_attempts(user_id, started_at desc);

create table public.quiz_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  attempt_id uuid not null,
  quiz_id uuid not null,
  question_id uuid not null,
  response_text text,
  is_correct boolean,
  marks_awarded numeric(7, 2) check (marks_awarded is null or marks_awarded >= 0),
  feedback text,
  evaluated_at timestamptz,
  created_at timestamptz not null default now(),
  unique (attempt_id, question_id),
  foreign key (attempt_id, user_id, quiz_id)
    references public.quiz_attempts(id, user_id, quiz_id) on delete cascade,
  foreign key (question_id, user_id, quiz_id)
    references public.quiz_questions(id, user_id, quiz_id) on delete cascade
);
create index quiz_responses_user_attempt_idx on public.quiz_responses(user_id, attempt_id);

create table public.topic_mastery_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  topic_id text not null,
  subject_id text not null,
  attempt_id uuid,
  mastery_score numeric(5, 2) not null check (mastery_score between 0 and 100),
  confidence numeric(5, 4) check (confidence is null or confidence between 0 and 1),
  evidence_summary text,
  recorded_at timestamptz not null default now(),
  foreign key (topic_id, subject_id)
    references public.topics(id, subject_id) on delete restrict,
  foreign key (attempt_id, user_id, subject_id)
    references public.quiz_attempts(id, user_id, subject_id) on delete set null (attempt_id)
);
create index topic_mastery_user_topic_time_idx
  on public.topic_mastery_history(user_id, topic_id, recorded_at desc);

create table public.revision_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  study_goal_id uuid not null,
  subject_id text not null,
  title text not null,
  is_active boolean not null default true,
  generated_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (id, user_id, subject_id),
  foreign key (study_goal_id, user_id, subject_id)
    references public.study_goals(id, user_id, subject_id) on delete cascade
);
create unique index revision_plans_one_active_idx
  on public.revision_plans(user_id) where is_active;
create index revision_plans_user_updated_idx on public.revision_plans(user_id, updated_at desc);

create table public.revision_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid not null,
  subject_id text not null,
  topic_id text not null,
  title text not null,
  scheduled_for timestamptz not null,
  duration_minutes integer not null check (duration_minutes between 5 and 360),
  status public.revision_session_status not null default 'scheduled',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (plan_id, user_id, subject_id)
    references public.revision_plans(id, user_id, subject_id) on delete cascade,
  foreign key (topic_id, subject_id)
    references public.topics(id, subject_id) on delete restrict
);
create index revision_sessions_user_schedule_idx
  on public.revision_sessions(user_id, scheduled_for);

create table public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  study_goal_id uuid,
  subject_id text not null references public.subjects(id) on delete restrict,
  topic_id text,
  title text not null default 'New conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (topic_id, subject_id)
    references public.topics(id, subject_id) on delete set null (topic_id),
  foreign key (study_goal_id, user_id, subject_id)
    references public.study_goals(id, user_id, subject_id) on delete set null (study_goal_id)
);
create index chat_conversations_user_updated_idx
  on public.chat_conversations(user_id, updated_at desc);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  conversation_id uuid not null,
  role public.chat_message_role not null,
  content text not null,
  source_chunk_id uuid,
  created_at timestamptz not null default now(),
  foreign key (conversation_id, user_id)
    references public.chat_conversations(id, user_id) on delete cascade,
  foreign key (source_chunk_id, user_id)
    references public.document_chunks(id, user_id) on delete set null (source_chunk_id)
);
create index chat_messages_user_conversation_time_idx
  on public.chat_messages(user_id, conversation_id, created_at);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger study_goals_set_updated_at before update on public.study_goals
  for each row execute function public.set_updated_at();
create trigger revision_plans_set_updated_at before update on public.revision_plans
  for each row execute function public.set_updated_at();
create trigger chat_conversations_set_updated_at before update on public.chat_conversations
  for each row execute function public.set_updated_at();

create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_auth_user();

create function public.save_study_goal(
  p_subject_id text,
  p_exam_name text,
  p_exam_date date,
  p_daily_minutes integer,
  p_session_duration integer,
  p_topic_ids text[]
)
returns public.study_goals
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_goal public.study_goals;
  v_requested_count integer := coalesce(cardinality(p_topic_ids), 0);
  v_valid_count integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  perform 1 from public.profiles where id = v_user_id for update;
  if p_daily_minutes not between 10 and 1440
     or p_session_duration not between 10 and 180
     or p_exam_name is not null and char_length(p_exam_name) > 120 then
    raise exception 'Invalid study goal values' using errcode = '22023';
  end if;
  if not exists (select 1 from public.subjects s where s.id = p_subject_id) then
    raise exception 'Unknown subject' using errcode = '22023';
  end if;
  if v_requested_count > 100 then
    raise exception 'A study goal can prioritize at most 100 topics' using errcode = '22023';
  end if;
  if (
    select count(distinct selected.topic_id)
    from unnest(coalesce(p_topic_ids, '{}')) as selected(topic_id)
  )
       <> v_requested_count then
    raise exception 'Duplicate topic selections are not allowed' using errcode = '22023';
  end if;

  select count(*) into v_valid_count
  from public.topics t
  where t.subject_id = p_subject_id
    and t.id = any(coalesce(p_topic_ids, '{}'));
  if v_valid_count <> v_requested_count then
    raise exception 'One or more topics do not belong to the selected subject' using errcode = '22023';
  end if;

  select * into v_goal from public.study_goals
  where user_id = v_user_id and is_active
  for update;
  if found then
    if v_goal.subject_id = p_subject_id then
      delete from public.topic_priorities where study_goal_id = v_goal.id;
      update public.study_goals
      set exam_name = nullif(btrim(p_exam_name), ''),
          exam_date = p_exam_date,
          daily_minutes = p_daily_minutes,
          preferred_session_duration = p_session_duration,
          updated_at = now()
      where id = v_goal.id
      returning * into v_goal;
    else
      update public.study_goals
      set is_active = false, updated_at = now()
      where id = v_goal.id;
      update public.revision_plans
      set is_active = false, updated_at = now()
      where user_id = v_user_id and is_active;
      insert into public.study_goals (
        user_id, subject_id, exam_name, exam_date, daily_minutes,
        preferred_session_duration
      ) values (
        v_user_id, p_subject_id, nullif(btrim(p_exam_name), ''), p_exam_date,
        p_daily_minutes, p_session_duration
      ) returning * into v_goal;
    end if;
  else
    insert into public.study_goals (
      user_id, subject_id, exam_name, exam_date, daily_minutes,
      preferred_session_duration
    ) values (
      v_user_id, p_subject_id, nullif(btrim(p_exam_name), ''), p_exam_date,
      p_daily_minutes, p_session_duration
    ) returning * into v_goal;
  end if;

  insert into public.topic_priorities (user_id, study_goal_id, subject_id, topic_id)
  select v_user_id, v_goal.id, p_subject_id, topic_id
  from unnest(coalesce(p_topic_ids, '{}')) as selected(topic_id);

  return v_goal;
end;
$$;
revoke all on function public.save_study_goal(text, text, date, integer, integer, text[]) from public, anon;
grant execute on function public.save_study_goal(text, text, date, integer, integer, text[]) to authenticated;
revoke all on function public.handle_new_auth_user() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;

alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.topics enable row level security;
alter table public.study_goals enable row level security;
alter table public.topic_priorities enable row level security;
alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;
alter table public.topic_source_mappings enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.quiz_responses enable row level security;
alter table public.topic_mastery_history enable row level security;
alter table public.revision_plans enable row level security;
alter table public.revision_sessions enable row level security;
alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;

create policy "Profiles are readable by their owner" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "Profiles are editable by their owner" on public.profiles
  for update to authenticated using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);
create policy "Subjects are readable" on public.subjects
  for select to anon, authenticated using (true);
create policy "Topics are readable" on public.topics
  for select to anon, authenticated using (true);

create policy "Study goals are private to their owner" on public.study_goals
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Topic priorities are private to their owner" on public.topic_priorities
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Documents are private to their owner" on public.documents
  for all to authenticated using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and split_part(storage_path, '/', 1) = user_id::text
  );
create policy "Document chunks are private to their owner" on public.document_chunks
  for all to authenticated using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.documents d
      where d.id = document_id and d.user_id = (select auth.uid())
    )
  );
create policy "Topic source mappings are private to their owner" on public.topic_source_mappings
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Quizzes are private to their owner" on public.quizzes
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Quiz questions are private to their owner" on public.quiz_questions
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Quiz attempts are private to their owner" on public.quiz_attempts
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Quiz responses are private to their owner" on public.quiz_responses
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Mastery history is private to its owner" on public.topic_mastery_history
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Revision plans are private to their owner" on public.revision_plans
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Revision sessions are private to their owner" on public.revision_sessions
  for all to authenticated using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.revision_plans p
      where p.id = plan_id and p.user_id = (select auth.uid())
    )
  );
create policy "Chat conversations are private to their owner" on public.chat_conversations
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Chat messages are private to their owner" on public.chat_messages
  for all to authenticated using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.chat_conversations c
      where c.id = conversation_id and c.user_id = (select auth.uid())
    )
  );

insert into public.subjects (id, name, description) values
  ('machine-learning', 'Machine Learning', 'Core machine-learning concepts and methods.'),
  ('mathematics', 'Mathematics', 'Foundational mathematics and problem-solving topics.'),
  ('biology', 'Biology', 'Core concepts in cell and organismal biology.')
on conflict (id) do nothing;

insert into public.topics (id, subject_id, name, sort_order) values
  ('machine-learning-topic-1', 'machine-learning', 'Linear Regression', 1),
  ('machine-learning-topic-2', 'machine-learning', 'Logistic Regression', 2),
  ('machine-learning-topic-3', 'machine-learning', 'Decision Trees', 3),
  ('machine-learning-topic-4', 'machine-learning', 'Random Forests', 4),
  ('machine-learning-topic-5', 'machine-learning', 'Clustering', 5),
  ('mathematics-topic-1', 'mathematics', 'Linear Equations', 1),
  ('mathematics-topic-2', 'mathematics', 'Quadratic Functions', 2),
  ('mathematics-topic-3', 'mathematics', 'Trigonometric Ratios', 3),
  ('mathematics-topic-4', 'mathematics', 'Probability', 4),
  ('mathematics-topic-5', 'mathematics', 'Sequences', 5),
  ('biology-topic-1', 'biology', 'Cell Structure', 1),
  ('biology-topic-2', 'biology', 'Cellular Respiration', 2),
  ('biology-topic-3', 'biology', 'Photosynthesis', 3),
  ('biology-topic-4', 'biology', 'Genetics', 4),
  ('biology-topic-5', 'biology', 'Ecology', 5)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'study-materials',
  'study-materials',
  false,
  52428800,
  array['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
on conflict (id) do nothing;

create policy "Owners can list private study files" on storage.objects
  for select to authenticated using (
    bucket_id = 'study-materials'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "Owners can upload private study files" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'study-materials'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "Owners can update private study files" on storage.objects
  for update to authenticated using (
    bucket_id = 'study-materials'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  ) with check (
    bucket_id = 'study-materials'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "Owners can delete private study files" on storage.objects
  for delete to authenticated using (
    bucket_id = 'study-materials'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
