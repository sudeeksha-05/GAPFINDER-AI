begin;

select plan(10);

select has_column(
  'public',
  'quiz_question_keys',
  'quiz_id',
  'answer keys retain their quiz association'
);
select has_constraint(
  'public',
  'quiz_question_keys',
  'quiz_question_keys_question_quiz_fkey',
  'answer keys reference a question within its owner and quiz'
);

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
    '10000000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'gapfinder-owner-one@example.test',
    '',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Test Owner One"}',
    now(),
    now()
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'gapfinder-owner-two@example.test',
    '',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Test Owner Two"}',
    now(),
    now()
  );

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$select public.save_study_goal(
    'machine-learning',
    'Isolation test',
    current_date + 30,
    45,
    25,
    array['machine-learning-topic-1']
  )$$,
  'authenticated user can save a valid owned study goal'
);
select throws_ok(
  $$select public.save_study_goal(
    'machine-learning',
    'Invalid subject/topic pair',
    current_date + 30,
    45,
    25,
    array['biology-topic-1']
  )$$,
  '22023',
  'One or more topics do not belong to the selected subject',
  'goal RPC rejects topics from another subject'
);
select is(
  (select count(*) from public.study_goals),
  1::bigint,
  'goal owner can read their study goal'
);
select lives_ok(
  $$select public.save_study_goal(
    'mathematics',
    'Changed subject',
    current_date + 45,
    60,
    40,
    array['mathematics-topic-1']
  )$$,
  'switching subjects creates a new active goal'
);
select is(
  (select count(*) from public.study_goals),
  2::bigint,
  'the previous subject goal remains in history'
);

select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000002', true);
select is(
  (select count(*) from public.study_goals),
  0::bigint,
  'another authenticated user cannot read that study goal'
);
select is(
  (
    with changed as (
      update public.study_goals set exam_name = 'Unauthorized change'
      returning id
    )
    select count(*) from changed
  ),
  0::bigint,
  'another authenticated user cannot update that study goal'
);
select is(
  has_table_privilege('authenticated', 'public.quiz_question_keys', 'SELECT'),
  false,
  'authenticated clients have no direct access to answer keys or rubrics'
);

reset role;
select * from finish();
rollback;
