begin;

select plan(10);

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '50000000-0000-4000-8000-000000000005',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'gapfinder-quiz-owner@example.test',
    '',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now()
  ),
  (
    '60000000-0000-4000-8000-000000000006',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'gapfinder-quiz-other@example.test',
    '',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now()
  );

insert into public.quizzes (id, user_id, subject_id, title)
values (
  '50000000-0000-4000-8000-000000000015',
  '50000000-0000-4000-8000-000000000005',
  'machine-learning',
  'Submission test'
);

insert into public.quiz_questions (
  id, user_id, quiz_id, subject_id, topic_id, question_type, difficulty,
  prompt, choices, source_reference, question_order
)
values
  (
    '50000000-0000-4000-8000-000000000025',
    '50000000-0000-4000-8000-000000000005',
    '50000000-0000-4000-8000-000000000015',
    'machine-learning',
    'machine-learning-topic-1',
    'multiple_choice',
    'beginner',
    'Question one?',
    array['Correct', 'Wrong A', 'Wrong B', 'Wrong C'],
    'Study notes.pdf · Page 3',
    0
  ),
  (
    '50000000-0000-4000-8000-000000000026',
    '50000000-0000-4000-8000-000000000005',
    '50000000-0000-4000-8000-000000000015',
    'machine-learning',
    'machine-learning-topic-1',
    'multiple_choice',
    'beginner',
    'Question two?',
    array['Wrong A', 'Correct', 'Wrong B', 'Wrong C'],
    null,
    1
  );

insert into public.quiz_question_keys (
  question_id, quiz_id, user_id, answer_key, grading_rubric
)
values
  (
    '50000000-0000-4000-8000-000000000025',
    '50000000-0000-4000-8000-000000000015',
    '50000000-0000-4000-8000-000000000005',
    'Correct',
    'Explanation one'
  ),
  (
    '50000000-0000-4000-8000-000000000026',
    '50000000-0000-4000-8000-000000000015',
    '50000000-0000-4000-8000-000000000005',
    'Correct',
    'Explanation two'
  );

set local role service_role;
select is(
  public.submit_quiz_attempt(
    '50000000-0000-4000-8000-000000000005',
    '50000000-0000-4000-8000-000000000015',
    '[{"question_id":"50000000-0000-4000-8000-000000000025","response_text":"Correct"}]'::jsonb
  )->>'score',
  '1',
  'server grades one correct answer and leaves the omitted question unanswered'
);
select is(
  (
    select count(*)
    from public.quiz_responses
    where quiz_id = '50000000-0000-4000-8000-000000000015'
      and user_id = '50000000-0000-4000-8000-000000000005'
  ),
  2::bigint,
  'the attempt stores a response row for every question, including unanswered'
);
select is(
  (
    select status::text
    from public.quiz_attempts
    where quiz_id = '50000000-0000-4000-8000-000000000015'
      and user_id = '50000000-0000-4000-8000-000000000005'
  ),
  'evaluated',
  'attempt is finalized as evaluated'
);
select is(
  (
    select source_reference
    from public.quiz_questions
    where id = '50000000-0000-4000-8000-000000000025'
  ),
  'Study notes.pdf · Page 3',
  'question source citation remains available for graded feedback'
);
select throws_ok(
  $$select public.submit_quiz_attempt(
    '60000000-0000-4000-8000-000000000006',
    '50000000-0000-4000-8000-000000000015',
    '[]'::jsonb
  )$$,
  '42501',
  'Quiz not found',
  'a different user cannot submit or inspect the quiz'
);
select throws_ok(
  $$select public.submit_quiz_attempt(
    '50000000-0000-4000-8000-000000000005',
    '50000000-0000-4000-8000-000000000015',
    '[{"question_id":"50000000-0000-4000-8000-000000000025","response_text":"Not an option"}]'::jsonb
  )$$,
  '22023',
  'A response does not belong to this quiz or its answer choices',
  'server rejects answers that are not among the saved options'
);
select is(
  (
    public.submit_quiz_attempt(
    '50000000-0000-4000-8000-000000000005',
    '50000000-0000-4000-8000-000000000015',
    '[{"question_id":"50000000-0000-4000-8000-000000000025","response_text":"Correct"}]'::jsonb
    )->>'attemptId'
  )::uuid,
  (
    select id
    from public.quiz_attempts
    where quiz_id = '50000000-0000-4000-8000-000000000015'
      and user_id = '50000000-0000-4000-8000-000000000005'
  ),
  'an identical duplicate request returns the original attempt without duplicating it'
);
select is(
  has_function_privilege(
    'authenticated',
    'public.submit_quiz_attempt(uuid,uuid,jsonb)',
    'EXECUTE'
  ),
  false,
  'authenticated clients cannot call the privileged grading function'
);
select is(
  has_table_privilege('authenticated', 'public.quiz_responses', 'INSERT'),
  false,
  'authenticated clients cannot forge quiz scores or response rows'
);
select is(
  has_table_privilege('authenticated', 'public.quiz_attempts', 'UPDATE'),
  false,
  'authenticated clients cannot alter evaluated attempts'
);

reset role;
select * from finish();
rollback;
