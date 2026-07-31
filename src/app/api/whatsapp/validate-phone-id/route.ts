export const dynamic = "force-dynamic";

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * Validates a Phone Number ID by querying Meta's Graph API.
 * Used before saving to catch cases where users enter the WABA ID instead.
 */
export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const ssrClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
    );
    const { data: { user } } = await ssrClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const phoneNumberId = searchParams.get('phoneNumberId');

    if (!phoneNumberId || !/^\d{10,20}$/.test(phoneNumberId)) {
      return NextResponse.json({ error: 'Invalid Phone Number ID format' }, { status: 400 });
    }

    // Use system token to verify the ID is actually a phone number (not a WABA ID)
    const token = process.env.META_SYSTEM_TOKEN;
    if (!token) {
      // Can't validate without system token — allow it through
      return NextResponse.json({ valid: true });
    }

    const r = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}?fields=id,display_phone_number,verified_name&access_token=${token}`
    );
    const d = await r.json();

    if (d.error) {
      // Specific error for nonexistent ID
      return NextResponse.json({
        error: 'This ID was not found in Meta. Make sure you copy the Phone Number ID from WhatsApp Manager → Phone Numbers (not the WABA ID).',
      }, { status: 400 });
    }

    if (!d.display_phone_number) {
      // Got a response but no phone fields — might be a WABA ID
      return NextResponse.json({
        error: 'This ID does not appear to be a Phone Number ID. It may be your WABA ID. Look for the ID next to your phone number in WhatsApp Manager.',
      }, { status: 400 });
    }

    return NextResponse.json({
      valid: true,
      phoneNumber: d.display_phone_number,
      businessName: d.verified_name || '',
    });
  } catch (err: any) {
    // Non-fatal — allow through if validation itself errors
    return NextResponse.json({ valid: true });
  }
}
