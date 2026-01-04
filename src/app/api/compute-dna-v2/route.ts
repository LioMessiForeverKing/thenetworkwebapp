import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();

        // Get session to verify user is authenticated
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Parse request body
        const body = await request.json().catch(() => ({}));
        const userId = body.user_id || session.user.id;
        const triggerSource = body.trigger_source || 'API_ROUTE_PROXY';

        // First verify YouTube data exists before calling edge function
        const [{ data: subs, error: subsError }, { data: likes, error: likesError }] = await Promise.all([
            supabase.from('youtube_subscriptions').select('channel_id').eq('user_id', userId).limit(1),
            supabase.from('youtube_liked_videos').select('video_id').eq('user_id', userId).limit(1)
        ]);

        if (subsError) {
            // Error checking subs
        }
        if (likesError) {
            // Error checking likes
        }

        const hasYouTubeData = (subs && subs.length > 0) || (likes && likes.length > 0);

        if (!hasYouTubeData) {
            return NextResponse.json({
                status: 'pending',
                message: 'YouTube data not yet available, please retry'
            }, { status: 202 });
        }

        // Call the edge function server-side (no CORS issues)
        // Note: Supabase converts hyphens to underscores in function names
        const { data, error } = await supabase.functions.invoke('compute_dna_v2', {
            body: {
                user_id: userId,
                trigger_source: triggerSource
            }
        });

        if (error) {
            // Try to get more details from the error
            const errorContext = (error as any).context;
            if (errorContext) {
                try {
                    const errorBody = await errorContext.json();
                    return NextResponse.json({ error: errorBody.error || error.message }, { status: errorContext.status || 500 });
                } catch (e) {
                    // Couldn't parse error body
                }
            }
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

