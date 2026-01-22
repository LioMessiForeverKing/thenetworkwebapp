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

        const userId = session.user.id;

        // Verify YouTube data exists
        const [{ data: subs }, { data: likes }] = await Promise.all([
            supabase.from('youtube_subscriptions').select('channel_id').eq('user_id', userId).limit(1),
            supabase.from('youtube_liked_videos').select('video_id').eq('user_id', userId).limit(1)
        ]);

        const hasYouTubeData = (subs && subs.length > 0) || (likes && likes.length > 0);

        if (!hasYouTubeData) {
            return NextResponse.json({
                error: 'No YouTube data found. Please connect your YouTube account first.'
            }, { status: 400 });
        }

        // Clear existing interest explanations so they regenerate with new interests
        await supabase
            .from('interest_explanations')
            .delete()
            .eq('user_id', userId);

        // Call the derive_interests edge function
        const { data, error } = await supabase.functions.invoke('derive_interests', {
            body: {
                user_id: userId
            }
        });

        if (error) {
            console.error('Error calling derive_interests:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            interests: data.interests,
            hierarchical_interests: data.hierarchical_interests,
            message: 'Interests regenerated successfully'
        });
    } catch (err: any) {
        console.error('Error in regenerate-interests:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
