-- Speed up "campaign replied" filter query:
-- SELECT phone FROM message_logs WHERE campaign_id = $1 AND tenant_id = $2 AND replied_at IS NOT NULL
-- Without this index Supabase does a full table scan on 50 lakh+ rows.
create index if not exists message_logs_campaign_replied_idx
  on message_logs (tenant_id, campaign_id)
  where replied_at is not null;
