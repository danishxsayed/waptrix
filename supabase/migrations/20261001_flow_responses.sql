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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'flow_responses' AND policyname = 'Tenant can access own flow responses'
  ) THEN
    CREATE POLICY "Tenant can access own flow responses"
      ON flow_responses FOR ALL
      USING (tenant_id = auth.uid());
  END IF;
END $$;
