alter table public.documents
  add column subject_id text references public.subjects(id) on delete set null,
  add column extracted_text_chars integer not null default 0
    check (extracted_text_chars >= 0),
  add column chunk_count integer not null default 0 check (chunk_count >= 0),
  add column processing_attempts integer not null default 0
    check (processing_attempts >= 0),
  add column processing_started_at timestamptz,
  add column embedding_model text,
  add column embedding_dimensions integer
    check (embedding_dimensions is null or embedding_dimensions = 1536),
  add constraint documents_user_subject_unique unique (id, user_id, subject_id);

create index documents_user_subject_idx
  on public.documents(user_id, subject_id, uploaded_at desc);

alter table public.document_chunks
  add column content_hash text,
  add column embedding_model text,
  add column embedding_dimensions integer
    check (embedding_dimensions is null or embedding_dimensions = 1536),
  add constraint document_chunks_id_user_document_unique
    unique (id, user_id, document_id);

create index document_chunks_embedding_hnsw_idx
  on public.document_chunks using hnsw (embedding extensions.vector_cosine_ops)
  where embedding is not null;

update public.documents document
set subject_id = mapping.subject_id
from (
  select mapping.document_id, mapping.user_id, min(topic.subject_id) as subject_id
  from public.topic_source_mappings mapping
  join public.topics topic on topic.id = mapping.topic_id
  group by mapping.document_id, mapping.user_id
  having count(distinct topic.subject_id) = 1
) mapping
where document.id = mapping.document_id
  and document.user_id = mapping.user_id
  and document.subject_id is null;

create function public.save_document_processing_chunks(
  p_user_id uuid,
  p_document_id uuid,
  p_chunks jsonb,
  p_embedding_model text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := p_user_id;
  v_saved integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_chunks is null
     or jsonb_typeof(p_chunks) <> 'array'
     or jsonb_array_length(p_chunks) = 0
     or jsonb_array_length(p_chunks) > 64
     or p_embedding_model <> 'text-embedding-3-small' then
    raise exception 'Invalid chunk batch' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.documents document
    where document.id = p_document_id
      and document.user_id = v_user_id
      and document.processing_status = 'processing'
  ) then
    raise exception 'Document processing claim is no longer valid' using errcode = '42501';
  end if;

  insert into public.document_chunks (
    user_id, document_id, chunk_index, page_number, section_heading,
    extracted_text, source_reference, content_hash, embedding,
    embedding_model, embedding_dimensions
  )
  select
    v_user_id,
    p_document_id,
    chunk.chunk_index,
    chunk.page_number,
    nullif(chunk.section_heading, ''),
    chunk.extracted_text,
    chunk.source_reference,
    chunk.content_hash,
    chunk.embedding::extensions.vector(1536),
    p_embedding_model,
    1536
  from jsonb_to_recordset(p_chunks) as chunk(
    chunk_index integer,
    page_number integer,
    section_heading text,
    extracted_text text,
    source_reference text,
    content_hash text,
    embedding text
  )
  where chunk.chunk_index >= 0
    and chunk.content_hash is not null
    and length(btrim(chunk.extracted_text)) > 0
    and chunk.embedding is not null
  on conflict (document_id, chunk_index) do update
  set page_number = excluded.page_number,
      section_heading = excluded.section_heading,
      extracted_text = excluded.extracted_text,
      source_reference = excluded.source_reference,
      content_hash = excluded.content_hash,
      embedding = excluded.embedding,
      embedding_model = excluded.embedding_model,
      embedding_dimensions = excluded.embedding_dimensions;

  get diagnostics v_saved = row_count;
  if v_saved <> jsonb_array_length(p_chunks) then
    raise exception 'Chunk batch contains invalid or duplicate entries' using errcode = '22023';
  end if;
  return v_saved;
end;
$$;

alter table public.topic_source_mappings
  add column subject_id text;

update public.topic_source_mappings mapping
set subject_id = document.subject_id
from public.documents document
where mapping.document_id = document.id
  and mapping.user_id = document.user_id;

alter table public.topic_source_mappings
  alter column subject_id set not null,
  add constraint topic_source_mappings_document_subject_fkey
    foreign key (document_id, user_id, subject_id)
    references public.documents(id, user_id, subject_id) on delete cascade,
  add constraint topic_source_mappings_topic_subject_fkey
    foreign key (topic_id, subject_id)
    references public.topics(id, subject_id) on delete cascade,
  add constraint topic_source_mappings_chunk_document_fkey
    foreign key (chunk_id, user_id, document_id)
    references public.document_chunks(id, user_id, document_id) on delete cascade;

drop policy "Documents are private to their owner" on public.documents;
drop policy "Document chunks are private to their owner" on public.document_chunks;
create policy "Owners can read their documents" on public.documents
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owners can read their document chunks" on public.document_chunks
  for select to authenticated using ((select auth.uid()) = user_id);

revoke insert, update, delete on public.documents from anon, authenticated;
revoke insert, update, delete on public.document_chunks from anon, authenticated;
revoke insert, update, delete on public.topic_source_mappings from anon, authenticated;
grant select on public.documents, public.document_chunks, public.topic_source_mappings
  to authenticated;

create function public.create_document_record(
  p_user_id uuid,
  p_document_id uuid,
  p_category public.document_category,
  p_storage_path text,
  p_original_filename text,
  p_mime_type text,
  p_file_size_bytes bigint,
  p_subject_id text default null
)
returns public.documents
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := p_user_id;
  v_goal_id uuid;
  v_document public.documents;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_storage_path is null or split_part(p_storage_path, '/', 1) <> v_user_id::text then
    raise exception 'Invalid private storage path' using errcode = '22023';
  end if;
  if p_file_size_bytes <= 0 or p_file_size_bytes > 52428800 then
    raise exception 'File size is outside the allowed range' using errcode = '22023';
  end if;
  if char_length(p_original_filename) < 1 or char_length(p_original_filename) > 255 then
    raise exception 'Invalid filename' using errcode = '22023';
  end if;
  if p_subject_id is not null then
    select id into v_goal_id from public.study_goals
    where user_id = v_user_id
      and subject_id = p_subject_id
      and is_active
    limit 1;
    if v_goal_id is null then
      raise exception 'Selected subject is not part of an active study goal'
        using errcode = '22023';
    end if;
  end if;

  insert into public.documents (
    id, user_id, study_goal_id, subject_id, category, storage_path,
    original_filename, mime_type, file_size_bytes, processing_status
  ) values (
    p_document_id, v_user_id, v_goal_id, p_subject_id, p_category, p_storage_path,
    p_original_filename, p_mime_type, p_file_size_bytes, 'queued'
  ) returning * into v_document;
  return v_document;
end;
$$;

create function public.claim_document_processing(p_user_id uuid, p_document_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := p_user_id;
  v_claimed integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  update public.documents
  set processing_status = 'processing',
      processing_started_at = now(),
      processing_attempts = processing_attempts + 1,
      extraction_error = null
  where id = p_document_id
    and user_id = v_user_id
    and (
      processing_status in ('queued', 'failed')
      or (
        processing_status = 'processing'
        and processing_started_at < now() - interval '60 minutes'
      )
    );
  get diagnostics v_claimed = row_count;
  return v_claimed = 1;
end;
$$;

create function public.complete_document_processing(
  p_user_id uuid,
  p_document_id uuid,
  p_extracted_text_chars integer,
  p_chunk_count integer,
  p_embedding_model text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := p_user_id;
  v_document public.documents;
  v_chunk_count integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_extracted_text_chars <= 0
     or p_chunk_count <= 0
     or p_chunk_count > 600
     or p_embedding_model <> 'text-embedding-3-small'
  then
    raise exception 'Invalid extracted document payload' using errcode = '22023';
  end if;

  select * into v_document
  from public.documents
  where id = p_document_id
    and user_id = v_user_id
    and processing_status = 'processing'
  for update;
  if not found then
    raise exception 'Document processing claim is no longer valid' using errcode = '42501';
  end if;

  delete from public.document_chunks
  where document_id = p_document_id
    and user_id = v_user_id
    and chunk_index >= p_chunk_count;
  select count(*) into v_chunk_count
  from public.document_chunks chunk
  where chunk.document_id = p_document_id
    and chunk.user_id = v_user_id
    and chunk.chunk_index < p_chunk_count
    and chunk.embedding is not null
    and chunk.embedding_dimensions = 1536
    and chunk.embedding_model = p_embedding_model
    and chunk.content_hash is not null
    and length(btrim(chunk.extracted_text)) > 0;
  if v_chunk_count <> p_chunk_count then
    raise exception 'Not all document chunks have valid embeddings' using errcode = '22023';
  end if;

  update public.documents
  set processing_status = 'ready',
      extracted_text_chars = p_extracted_text_chars,
      chunk_count = v_chunk_count,
      embedding_model = p_embedding_model,
      embedding_dimensions = 1536,
      processed_at = now(),
      processing_started_at = null,
      extraction_error = null
  where id = p_document_id and user_id = v_user_id;
  return true;
end;
$$;

create function public.fail_document_processing(
  p_user_id uuid,
  p_document_id uuid,
  p_error_message text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := p_user_id;
  v_updated integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  update public.documents
  set processing_status = 'failed',
      extraction_error = left(coalesce(nullif(btrim(p_error_message), ''), 'Document processing failed.'), 500),
      processing_started_at = null,
      processed_at = null,
      chunk_count = 0,
      extracted_text_chars = 0,
      embedding_model = null,
      embedding_dimensions = null
  where id = p_document_id
    and user_id = v_user_id
    and processing_status = 'processing';
  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

create function public.delete_document_record(p_user_id uuid, p_document_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := p_user_id;
  v_deleted integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  delete from public.documents
  where id = p_document_id and user_id = v_user_id;
  get diagnostics v_deleted = row_count;
  return v_deleted = 1;
end;
$$;

create function public.match_document_chunks(
  p_user_id uuid,
  query_embedding extensions.vector(1536),
  match_count integer default 5,
  match_threshold real default 0.35,
  filter_subject_id text default null,
  filter_document_ids uuid[] default null,
  filter_topic_id text default null
)
returns table (
  chunk_id uuid,
  document_id uuid,
  document_name text,
  subject_id text,
  subject_name text,
  chunk_index integer,
  page_number integer,
  section_heading text,
  source_reference text,
  extracted_text text,
  similarity real,
  matched_topic_id text
)
language plpgsql
stable
set search_path = ''
as $$
declare
  v_user_id uuid := p_user_id;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if match_count < 1 or match_count > 20
     or match_threshold < 0 or match_threshold > 1 then
    raise exception 'Invalid retrieval limits' using errcode = '22023';
  end if;

  return query
  select
    chunk.id,
    document.id,
    document.original_filename,
    document.subject_id,
    subject.name,
    chunk.chunk_index,
    chunk.page_number,
    chunk.section_heading,
    chunk.source_reference,
    chunk.extracted_text,
    (1 - (chunk.embedding <=> query_embedding))::real,
    filter_topic_id
  from public.document_chunks chunk
  join public.documents document
    on document.id = chunk.document_id
   and document.user_id = chunk.user_id
  left join public.subjects subject on subject.id = document.subject_id
  where chunk.user_id = v_user_id
    and document.user_id = v_user_id
    and document.processing_status = 'ready'
    and chunk.embedding is not null
    and chunk.embedding_model = 'text-embedding-3-small'
    and (filter_subject_id is null or document.subject_id = filter_subject_id)
    and (filter_document_ids is null or document.id = any(filter_document_ids))
    and (
      filter_topic_id is null
      or exists (
        select 1
        from public.topic_source_mappings mapping
        where mapping.chunk_id = chunk.id
          and mapping.document_id = document.id
          and mapping.user_id = v_user_id
          and mapping.topic_id = filter_topic_id
          and mapping.subject_id = document.subject_id
      )
    )
    and (1 - (chunk.embedding <=> query_embedding)) >= match_threshold
  order by chunk.embedding <=> query_embedding
  limit match_count;
end;
$$;

revoke all on function public.create_document_record(
  uuid, uuid, public.document_category, text, text, text, bigint, text
) from public, anon, authenticated;
revoke all on function public.claim_document_processing(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.save_document_processing_chunks(uuid, uuid, jsonb, text)
  from public, anon, authenticated;
revoke all on function public.complete_document_processing(uuid, uuid, integer, integer, text)
  from public, anon, authenticated;
revoke all on function public.fail_document_processing(uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.delete_document_record(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.match_document_chunks(
  uuid, extensions.vector, integer, real, text, uuid[], text
) from public, anon, authenticated;
grant execute on function public.create_document_record(
  uuid, uuid, public.document_category, text, text, text, bigint, text
) to service_role;
grant execute on function public.claim_document_processing(uuid, uuid) to service_role;
grant execute on function public.save_document_processing_chunks(uuid, uuid, jsonb, text)
  to service_role;
grant execute on function public.complete_document_processing(uuid, uuid, integer, integer, text)
  to service_role;
grant execute on function public.fail_document_processing(uuid, uuid, text) to service_role;
grant execute on function public.delete_document_record(uuid, uuid) to service_role;
grant execute on function public.match_document_chunks(
  uuid, extensions.vector, integer, real, text, uuid[], text
) to service_role;
