begin;

select plan(15);

select has_constraint(
  'public',
  'documents',
  'documents_id_user_unique',
  'documents have a composite owner key for ownership-safe foreign keys'
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
    '30000000-0000-4000-8000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'gapfinder-document-owner@example.test',
    '',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Document Owner"}',
    now(),
    now()
  ),
  (
    '40000000-0000-4000-8000-000000000004',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'gapfinder-document-other@example.test',
    '',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Other Student"}',
    now(),
    now()
  );

set local role service_role;
select lives_ok(
  $$select public.create_document_record(
    '30000000-0000-4000-8000-000000000003',
    '30000000-0000-4000-8000-000000000003',
    'other',
    '30000000-0000-4000-8000-000000000003/30000000-0000-4000-8000-000000000003/notes.txt',
    'notes.txt',
    'text/plain',
    64,
    null
  )$$,
  'server-side record creation accepts its verified owner and private path'
);
select is(
  (
    select processing_status::text
    from public.documents
    where id = '30000000-0000-4000-8000-000000000003'
  ),
  'queued',
  'new uploaded document begins queued'
);
select is(
  public.claim_document_processing(
    '30000000-0000-4000-8000-000000000003',
    '30000000-0000-4000-8000-000000000003'
  ),
  true,
  'owner processing job can claim a queued document'
);
select is(
  public.claim_document_processing(
    '30000000-0000-4000-8000-000000000003',
    '30000000-0000-4000-8000-000000000003'
  ),
  false,
  'duplicate processing request cannot claim an active document'
);
select is(
  (
    select count(*)
    from public.documents
    where id = '30000000-0000-4000-8000-000000000003'
      and user_id = '30000000-0000-4000-8000-000000000003'
  ),
  1::bigint,
  'server-side listing is scoped to the verified owner'
);
select is(
  public.claim_document_processing(
    '40000000-0000-4000-8000-000000000004',
    '30000000-0000-4000-8000-000000000003'
  ),
  false,
  'processing RPC cannot claim another user document'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000004', true);
select is(
  (select count(*) from public.documents),
  0::bigint,
  'authenticated users cannot read another users document'
);
select is(
  has_table_privilege('authenticated', 'public.documents', 'INSERT'),
  false,
  'authenticated clients cannot insert unprocessed document records directly'
);
select is(
  has_table_privilege('authenticated', 'public.document_chunks', 'INSERT'),
  false,
  'authenticated clients cannot insert or forge document chunks'
);
select is(
  has_function_privilege(
    'authenticated',
    'public.save_document_processing_chunks(uuid,uuid,jsonb,text)',
    'EXECUTE'
  ),
  false,
  'authenticated clients cannot directly write embedded chunks'
);
select is(
  (select public from storage.buckets where id = 'study-materials'),
  false,
  'study materials remain in a private Storage bucket'
);
select is(
  (
    select count(*)
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname in (
        'Owners can list private study files',
        'Owners can upload private study files',
        'Owners can update private study files',
        'Owners can delete private study files'
      )
  ),
  4::bigint,
  'all four owner-scoped Storage policies remain installed'
);

set local role service_role;
select lives_ok(
  $$select public.delete_document_record(
    '30000000-0000-4000-8000-000000000003',
    '30000000-0000-4000-8000-000000000003'
  )$$,
  'server-side deletion removes the users owned metadata'
);
select is(
  (
    select count(*)
    from public.documents
    where id = '30000000-0000-4000-8000-000000000003'
  ),
  0::bigint,
  'deleted document no longer remains in metadata'
);

reset role;
select * from finish();
rollback;
