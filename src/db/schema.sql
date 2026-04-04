create extension if not exists pgcrypto;

do $$
begin
  create type user_role as enum ('viewer', 'analyst', 'admin');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type user_status as enum ('active', 'inactive');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type record_type as enum ('income', 'expense');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type record_status as enum ('active', 'reverted', 'reversal');
exception
  when duplicate_object then null;
end $$;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password_hash text not null,
  role user_role not null default 'viewer',
  status user_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists financial_records (
  id uuid primary key default gen_random_uuid(),
  amount numeric(12, 2) not null check (amount > 0),
  type record_type not null,
  category text not null,
  entry_date date not null,
  notes text,
  status record_status not null default 'active',
  reversal_of uuid references financial_records(id),
  reverted_at timestamptz,
  reverted_by uuid references users(id),
  revert_reason text,
  created_by uuid not null references users(id),
  updated_by uuid references users(id),
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint financial_records_reversal_link_check check (
    (status = 'reversal' and reversal_of is not null)
    or (status <> 'reversal' and reversal_of is null)
  ),
  constraint financial_records_self_reversal_check check (
    reversal_of is null or reversal_of <> id
  )
);

create table if not exists user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  role_snapshot user_role not null,
  last_activity_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  revoked_reason text,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id bigserial primary key,
  action text not null,
  actor_id uuid references users(id),
  target_type text not null,
  target_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_users_email on users(email);
create index if not exists idx_users_role on users(role);
create index if not exists idx_users_status on users(status);

create index if not exists idx_records_entry_date on financial_records(entry_date);
create index if not exists idx_records_category on financial_records(category);
create index if not exists idx_records_type on financial_records(type);
create index if not exists idx_records_status on financial_records(status);
create index if not exists idx_records_is_deleted on financial_records(is_deleted);
create index if not exists idx_records_reversal_of on financial_records(reversal_of);

create unique index if not exists idx_records_unique_reversal
  on financial_records(reversal_of)
  where reversal_of is not null and is_deleted = false and status = 'reversal';

create index if not exists idx_sessions_user on user_sessions(user_id);
create index if not exists idx_sessions_expires_at on user_sessions(expires_at);
create index if not exists idx_sessions_revoked_at on user_sessions(revoked_at);

create index if not exists idx_audit_actor_id on audit_logs(actor_id);
create index if not exists idx_audit_created_at on audit_logs(created_at);
create index if not exists idx_audit_target on audit_logs(target_type, target_id);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trigger_users_set_updated_at on users;
create trigger trigger_users_set_updated_at
before update on users
for each row
execute function set_updated_at();

drop trigger if exists trigger_records_set_updated_at on financial_records;
create trigger trigger_records_set_updated_at
before update on financial_records
for each row
execute function set_updated_at();

create or replace function revert_financial_record(
  p_record_id uuid,
  p_actor_id uuid,
  p_reason text default null
)
returns uuid
language plpgsql
as $$
declare
  v_original financial_records%rowtype;
  v_reversal_id uuid;
begin
  select *
  into v_original
  from financial_records
  where id = p_record_id
  for update;

  if not found then
    raise exception 'record_not_found';
  end if;

  if v_original.is_deleted then
    raise exception 'record_deleted';
  end if;

  if v_original.status <> 'active' then
    raise exception 'record_not_active';
  end if;

  if exists (
    select 1
    from financial_records
    where reversal_of = p_record_id
      and status = 'reversal'
      and is_deleted = false
  ) then
    raise exception 'already_reverted';
  end if;

  insert into financial_records (
    amount,
    type,
    category,
    entry_date,
    notes,
    status,
    reversal_of,
    created_by,
    updated_by
  )
  values (
    v_original.amount,
    case
      when v_original.type = 'income' then 'expense'
      else 'income'
    end,
    v_original.category,
    current_date,
    concat(
      'Reversal for record ',
      v_original.id::text,
      case
        when p_reason is not null and length(trim(p_reason)) > 0 then ' | Reason: ' || trim(p_reason)
        else ''
      end
    ),
    'reversal',
    v_original.id,
    p_actor_id,
    p_actor_id
  )
  returning id into v_reversal_id;

  update financial_records
  set
    status = 'reverted',
    reverted_at = now(),
    reverted_by = p_actor_id,
    revert_reason = nullif(trim(p_reason), ''),
    updated_by = p_actor_id
  where id = p_record_id;

  return v_reversal_id;
end;
$$;
