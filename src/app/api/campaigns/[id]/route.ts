export const dynamic = "force-dynamic";

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function DELETE(
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

    // First delete dependent message_logs
    await serviceClient
      .from('message_logs')
      .delete()
      .eq('campaign_id', id);

    // Now delete the campaign
    const { error: deleteError } = await serviceClient
      .from('campaigns')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Campaign deleted successfully.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
