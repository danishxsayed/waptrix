-- Priority inbox: allow marking conversations as priority
alter table conversations
  add column if not exists is_priority boolean not null default false;

create index if not exists conversations_priority_idx
  on conversations (tenant_id, is_priority)
  where is_priority = true;
