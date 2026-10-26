create function public.submit_quiz_attempt(
  p_user_id uuid,
  p_quiz_id uuid,
  p_responses jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quiz public.quizzes%rowtype;
  v_attempt_id uuid;
  v_question_count integer;
  v_score integer;
  v_result jsonb;
begin
  if p_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_responses is null
     or jsonb_typeof(p_responses) <> 'array'
     or jsonb_array_length(p_responses) > 10 then
    raise exception 'Invalid quiz responses' using errcode = '22023';
  end if;

  select * into v_quiz
  from public.quizzes
  where id = p_quiz_id and user_id = p_user_id
  for update;
  if not found then
    raise exception 'Quiz not found' using errcode = '42501';
  end if;

  select count(*) into v_question_count
  from public.quiz_questions
  where quiz_id = p_quiz_id and user_id = p_user_id;
  if v_question_count < 1 or v_question_count > 10 then
    raise exception 'Quiz question count is invalid' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_responses) as submitted(question_id uuid, response_text text)
    where submitted.question_id is null
       or submitted.response_text is null
       or length(submitted.response_text) > 500
  ) or (
    select count(*) <> count(distinct submitted.question_id)
    from jsonb_to_recordset(p_responses) as submitted(question_id uuid, response_text text)
  ) then
    raise exception 'Invalid or duplicate question responses' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_responses) as submitted(question_id uuid, response_text text)
    left join public.quiz_questions question
      on question.id = submitted.question_id
     and question.quiz_id = p_quiz_id
     and question.user_id = p_user_id
    where question.id is null
       or not (submitted.response_text = any(question.choices))
  ) then
    raise exception 'A response does not belong to this quiz or its answer choices' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.quiz_questions question
    left join public.quiz_question_keys answer_key
      on answer_key.question_id = question.id
     and answer_key.quiz_id = question.quiz_id
     and answer_key.user_id = question.user_id
    where question.quiz_id = p_quiz_id
      and question.user_id = p_user_id
      and answer_key.question_id is null
  ) then
    raise exception 'Quiz answer keys are incomplete' using errcode = '22023';
  end if;

  select attempt.id into v_attempt_id
  from public.quiz_attempts attempt
  where attempt.quiz_id = p_quiz_id
    and attempt.user_id = p_user_id
    and attempt.status = 'evaluated'
  order by attempt.submitted_at desc
  limit 1;

  if v_attempt_id is not null then
    if exists (
      select 1
      from public.quiz_questions question
      left join public.quiz_responses saved
        on saved.question_id = question.id
       and saved.attempt_id = v_attempt_id
       and saved.user_id = p_user_id
      left join jsonb_to_recordset(p_responses) as submitted(question_id uuid, response_text text)
        on submitted.question_id = question.id
      where question.quiz_id = p_quiz_id
        and question.user_id = p_user_id
        and coalesce(saved.response_text, '') <> coalesce(submitted.response_text, '')
    ) then
      raise exception 'This quiz has already been submitted' using errcode = '23505';
    end if;
  else
    v_attempt_id := gen_random_uuid();
    insert into public.quiz_attempts (
      id, user_id, quiz_id, subject_id, status, started_at
    ) values (
      v_attempt_id, p_user_id, p_quiz_id, v_quiz.subject_id, 'in_progress', now()
    );

    insert into public.quiz_responses (
      user_id, attempt_id, quiz_id, question_id, response_text, is_correct,
      marks_awarded, feedback, evaluated_at
    )
    select
      p_user_id,
      v_attempt_id,
      question.quiz_id,
      question.id,
      submitted.response_text,
      submitted.response_text is not null
        and submitted.response_text = answer_key.answer_key,
      case
        when submitted.response_text is not null
          and submitted.response_text = answer_key.answer_key then 1
        else 0
      end,
      answer_key.grading_rubric,
      now()
    from public.quiz_questions question
    join public.quiz_question_keys answer_key
      on answer_key.question_id = question.id
     and answer_key.quiz_id = question.quiz_id
     and answer_key.user_id = question.user_id
    left join jsonb_to_recordset(p_responses) as submitted(question_id uuid, response_text text)
      on submitted.question_id = question.id
    where question.quiz_id = p_quiz_id
      and question.user_id = p_user_id;

    select count(*)::integer into v_score
    from public.quiz_responses
    where attempt_id = v_attempt_id
      and user_id = p_user_id
      and is_correct;

    update public.quiz_attempts
    set status = 'evaluated',
        score = v_score,
        max_score = v_question_count,
        submitted_at = now(),
        evaluated_at = now()
    where id = v_attempt_id
      and user_id = p_user_id;
  end if;

  select jsonb_build_object(
    'attemptId', attempt.id,
    'quizId', attempt.quiz_id,
    'score', attempt.score,
    'maxScore', attempt.max_score,
    'submittedAt', attempt.submitted_at,
    'questions', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'questionId', question.id,
          'prompt', question.prompt,
          'options', question.choices,
          'selectedAnswer', response.response_text,
          'correctAnswer', answer_key.answer_key,
          'isCorrect', response.is_correct,
          'explanation', answer_key.grading_rubric,
          'sourceReference', question.source_reference,
          'documentName', document.original_filename
        ) order by question.question_order
      ),
      '[]'::jsonb
    )
  ) into v_result
  from public.quiz_attempts attempt
  join public.quiz_questions question
    on question.quiz_id = attempt.quiz_id
   and question.user_id = attempt.user_id
  join public.quiz_question_keys answer_key
    on answer_key.question_id = question.id
   and answer_key.quiz_id = question.quiz_id
   and answer_key.user_id = question.user_id
  join public.quiz_responses response
    on response.question_id = question.id
   and response.attempt_id = attempt.id
   and response.user_id = attempt.user_id
  left join public.document_chunks source_chunk
    on source_chunk.id = question.source_chunk_id
   and source_chunk.user_id = question.user_id
  left join public.documents document
    on document.id = source_chunk.document_id
   and document.user_id = question.user_id
  where attempt.id = v_attempt_id
    and attempt.user_id = p_user_id
  group by attempt.id;

  return v_result;
end;
$$;

revoke all on function public.submit_quiz_attempt(uuid, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.submit_quiz_attempt(uuid, uuid, jsonb)
  to service_role;

revoke insert, update, delete
  on public.quizzes, public.quiz_questions, public.quiz_attempts, public.quiz_responses
  from anon, authenticated;
