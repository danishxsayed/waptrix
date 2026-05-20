export const dynamic = "force-dynamic";

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { createClient: createServiceClient } = await import('@supabase/supabase-js');
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // Verify campaign ownership
    const { data: campaign, error: campaignError } = await serviceClient
      .from('campaigns')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', user.id)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found or unauthorized' }, { status: 404 });
    }

    const { data, error } = await serviceClient
      .from('campaign_logs')
      .select('*')
      .eq('campaign_id', id)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
