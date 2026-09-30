-- WhatsApp Flows: store form submissions from nfm_reply webhook events
create table if not exists flow_responses (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null,
  flow_id        text not null,
  flow_name      text,
  flow_token     text,
  contact_phone  text not null,
  contact_id     uuid,
  response_data  jsonb not null default '{}',
  created_at     timestamptz not null default now()
);

create index if not exists flow_responses_tenant_id_idx    on flow_responses (tenant_id);
create index if not exists flow_responses_flow_id_idx      on flow_responses (flow_id);
create index if not exists flow_responses_contact_phone_idx on flow_responses (contact_phone);

alter table flow_responses enable row level security;

create policy "Tenant can access own flow responses"
  on flow_responses for all
  using (tenant_id = auth.uid());
