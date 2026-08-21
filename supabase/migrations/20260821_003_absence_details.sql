alter table public.availability_blocks
  add column if not exists reason text not null default 'other',
  add column if not exists note text;

alter table public.availability_blocks
  add constraint availability_blocks_reason_check
  check (reason in ('vacation', 'illness', 'personal', 'holiday', 'other'));
