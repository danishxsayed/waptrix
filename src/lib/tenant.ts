/**
 * Tenant resolution helper
 *
 * Every API route should call getEffectiveTenantId(user.id) instead of
 * using user.id directly as the tenant_id.
 *
 * If the logged-in user is a team member (staff), we return their owner's
 * tenant_id so all queries run against the owner's data.
 * If they are an owner (no team_members row), we return their own user.id.
 */

import { createClient } from '@supabase/supabase-js';

let _db: ReturnType<typeof createClient> | null = null;

function getDb() {
  if (!_db) {
    _db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
  }
  return _db;
}

/**
 * Returns the effective tenant_id for any authenticated user.
 * - Owner  → their own user.id
 * - Staff  → their owner's tenant_id
 */
export async function getEffectiveTenantId(userId: string): Promise<string> {
  try {
    const { data } = await getDb()
      .from('team_members')
      .select('owner_tenant_id')
      .eq('member_user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    return data?.owner_tenant_id ?? userId;
  } catch {
    // If team_members table doesn't exist yet, fall back to user's own id
    return userId;
  }
}

/**
 * Returns the user's role within the team.
 * - 'owner'  if they own the tenant
 * - 'admin' | 'agent' if they are a team member
 */
export async function getMemberRole(
  userId: string
): Promise<'owner' | 'admin' | 'agent'> {
  try {
    const { data } = await getDb()
      .from('team_members')
      .select('role')
      .eq('member_user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    if (!data) return 'owner';
    return data.role as 'admin' | 'agent';
  } catch {
    return 'owner';
  }
}
