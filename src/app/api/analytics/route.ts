export const dynamic = "force-dynamic";

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const ssrClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
    );
    const { data: { user } } = await ssrClient.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // 1. Fetch campaigns stats
    const { data: campaigns, error: campaignError } = await serviceClient
      .from('campaigns')
      .select('sent_count, failed_count, delivered_count, read_count')
      .eq('tenant_id', user.id);

    if (campaignError) throw campaignError;

    let totalSent = 0;
    let totalFailed = 0;
    let totalDelivered = 0;
    let totalRead = 0;

    if (campaigns) {
      campaigns.forEach(c => {
        totalSent += c.sent_count || 0;
        totalFailed += c.failed_count || 0;
        totalDelivered += c.delivered_count || 0;
        totalRead += c.read_count || 0;
      });
    }

    // Smart delivery rate calculation:
    // If webhook delivered tracking is active, use (delivered / sent). 
    // Fallback to (sent / (sent + failed)) if delivered is 0 but sent > 0.
    let deliveryRate = 100;
    if (totalSent > 0) {
      if (totalDelivered > 0) {
        deliveryRate = (totalDelivered / totalSent) * 100;
      } else if (totalFailed > 0) {
        deliveryRate = (totalSent / (totalSent + totalFailed)) * 100;
      } else {
        deliveryRate = 100; // all successful sends, no failures
      }
    }

    // 2. Fetch contacts count
    const { count: contactsCount, error: contactsError } = await serviceClient
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', user.id);

    if (contactsError) throw contactsError;

    // 3. Fetch active templates count
    const { count: templatesCount, error: templatesError } = await serviceClient
      .from('templates')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', user.id);

    if (templatesError) throw templatesError;

    // 4. Fetch 14-day message volume chart data
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    // Fetch all successfully-sent logs (sent/delivered/read) — process-batch writes sent_at
    const { data: logs, error: logsError } = await serviceClient
      .from('message_logs')
      .select('sent_at, status, read_at')
      .eq('tenant_id', user.id)
      .in('status', ['sent', 'delivered', 'read'])
      .gte('sent_at', fourteenDaysAgo.toISOString());

    // Generate chronological array for the last 14 days
    const chartData: { date: string; sent: number; read: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
      chartData.push({ date: dateStr, sent: 0, read: 0 });
    }

    // Group logs by sent_at for sent count; by read_at for real read count
    if (logs && !logsError) {
      logs.forEach(log => {
        // Count sent by send date
        if (log.sent_at) {
          const dateStr = new Date(log.sent_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
          const dayObj = chartData.find(item => item.date === dateStr);
          if (dayObj) dayObj.sent += 1;
        }
        // Count reads by actual read date (only if read_at is populated by webhook)
        if (log.read_at) {
          const readDateStr = new Date(log.read_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
          const readDayObj = chartData.find(item => item.date === readDateStr);
          if (readDayObj) readDayObj.read += 1;
        }
      });
    }

    const finalizedChartData = chartData;

    return NextResponse.json({
      stats: {
        totalSent,
        deliveryRate: Number(deliveryRate.toFixed(1)),
        totalContacts: contactsCount || 0,
        activeTemplates: templatesCount || 0,
        totalRead,
        totalDelivered,
        totalFailed
      },
      chartData: finalizedChartData
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
