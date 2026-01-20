import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

// GET: Get profiles by IDs (for displaying invitee info)
export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const idsParam = searchParams.get('ids');

        if (!idsParam) {
            return NextResponse.json({ error: 'ids parameter is required' }, { status: 400 });
        }

        const ids = idsParam.split(',').filter(Boolean);

        if (ids.length === 0) {
            return NextResponse.json({ profiles: [] });
        }

        // Fetch profiles - only return basic info (name, avatar, location)
        const { data: profiles, error } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, location')
            .in('id', ids);

        if (error) {
            console.error('Error fetching profiles:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Fetch college information from user_profile_extras
        const { data: profileExtras } = await supabase
            .from('user_profile_extras')
            .select('user_id, college')
            .in('user_id', ids);

        // Create map of user_id -> college
        const collegeMap = new Map<string, string | null>();
        if (profileExtras) {
            profileExtras.forEach((extra: any) => {
                collegeMap.set(extra.user_id, extra.college || null);
            });
        }

        // Add college to each profile
        const profilesWithCollege = (profiles || []).map((profile: any) => ({
            ...profile,
            school: collegeMap.get(profile.id) || null
        }));

        return NextResponse.json({ profiles: profilesWithCollege });
    } catch (error: any) {
        console.error('Error in GET /api/profiles:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
