'use server';

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const ADMIN_PASSWORD = 'Superman1234@';

export async function getPartyAdminData(password: string) {
  if (password !== ADMIN_PASSWORD) {
    return { error: 'Invalid password' };
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is missing');
    return { error: 'Service configuration error. Check server logs.' };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Get all parties
    const { data: parties, error: partiesError } = await supabase
      .from('parties')
      .select('*')
      .order('created_at', { ascending: false });

    if (partiesError) throw partiesError;

    return { data: { parties: parties || [] } };
  } catch (error: any) {
    console.error('Get Party Admin Data Error:', error);
    return { error: error.message || 'Failed to load parties' };
  }
}

export async function getPartyStats(password: string, partyId: string) {
  if (password !== ADMIN_PASSWORD) {
    return { error: 'Invalid password' };
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    return { error: 'Service configuration error' };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Get RSVP counts
    const { data: rsvps, error: rsvpError } = await supabase
      .from('party_rsvps')
      .select('status, ticket_code')
      .eq('party_id', partyId);

    if (rsvpError) throw rsvpError;

    const stats = {
      party_id: partyId,
      total_rsvps: rsvps?.length || 0,
      going_count: rsvps?.filter((r: any) => r.status === 'going').length || 0,
      maybe_count: rsvps?.filter((r: any) => r.status === 'maybe').length || 0,
      declined_count: rsvps?.filter((r: any) => r.status === 'declined').length || 0,
      with_tickets: rsvps?.filter((r: any) => r.ticket_code).length || 0,
    };

    // Get detailed RSVP list with user info
    const { data: detailedRsvps, error: detailError } = await supabase
      .from('party_rsvps')
      .select('id, user_id, status, ticket_code, rsvped_at, source')
      .eq('party_id', partyId)
      .order('rsvped_at', { ascending: false });

    if (detailError) throw detailError;

    // Get user profiles separately to avoid join issues
    const userIds = detailedRsvps?.map((r: any) => r.user_id).filter(Boolean) || [];
    const userProfiles: Record<string, any> = {};
    
    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);
      
      if (!profilesError && profiles) {
        profiles.forEach((p: any) => {
          userProfiles[p.id] = p;
        });
      }
    }

    // Get waitlist entries linked to this party
    const { data: waitlistRsvps, error: waitlistError } = await supabase
      .from('waitlist')
      .select('id, name, email, party_ticket_code, created_at')
      .eq('party_id', partyId)
      .order('created_at', { ascending: false });

    if (waitlistError) console.error('Waitlist error:', waitlistError);

    // Combine both sources
    const details: any[] = [];

    // Add authenticated user RSVPs
    detailedRsvps?.forEach((rsvp: any) => {
      const profile = rsvp.user_id ? userProfiles[rsvp.user_id] : null;
      details.push({
        id: rsvp.id,
        user_id: rsvp.user_id,
        status: rsvp.status,
        ticket_code: rsvp.ticket_code,
        rsvped_at: rsvp.rsvped_at,
        source: rsvp.source,
        user_name: profile?.full_name || null,
        user_email: profile?.email || null,
        waitlist_name: null,
        waitlist_email: null,
      });
    });

    // Add waitlist RSVPs (non-authenticated)
    waitlistRsvps?.forEach((waitlist: any) => {
      details.push({
        id: `waitlist-${waitlist.id}`, // Use actual waitlist id
        waitlist_id: waitlist.id, // Store actual id for deletion
        user_id: null,
        status: 'going',
        ticket_code: waitlist.party_ticket_code,
        rsvped_at: waitlist.created_at,
        source: 'waitlist',
        user_name: null,
        user_email: null,
        waitlist_name: waitlist.name,
        waitlist_email: waitlist.email,
      });
    });

    return {
      data: {
        stats,
        rsvps: details,
      },
    };
  } catch (error: any) {
    console.error('Get Party Stats Error:', error);
    return { error: error.message || 'Failed to load party stats' };
  }
}

export async function deleteRsvp(password: string, rsvpId: string, source: string, waitlistId?: string, email?: string) {
  if (password !== ADMIN_PASSWORD) {
    return { error: 'Invalid password' };
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    return { error: 'Service configuration error' };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    if (source === 'waitlist') {
      // Delete from waitlist table - use waitlist_id if available, otherwise use email
      if (waitlistId) {
        const { error: deleteError } = await supabase
          .from('waitlist')
          .delete()
          .eq('id', waitlistId);

        if (deleteError) throw deleteError;
      } else if (email) {
        const { error: deleteError } = await supabase
          .from('waitlist')
          .delete()
          .eq('email', email.toLowerCase());

        if (deleteError) throw deleteError;
      } else {
        return { error: 'Missing waitlist ID or email for deletion' };
      }
    } else {
      // Delete from party_rsvps table
      const { error: deleteError } = await supabase
        .from('party_rsvps')
        .delete()
        .eq('id', rsvpId);

      if (deleteError) throw deleteError;
    }

    return { success: true };
  } catch (error: any) {
    console.error('Delete RSVP Error:', error);
    return { error: error.message || 'Failed to delete RSVP' };
  }
}
