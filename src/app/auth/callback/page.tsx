'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { YouTubeService } from '@/services/youtube';

export default function AuthCallback() {
    const router = useRouter();
    const [status, setStatus] = useState('Completing sign in...');
    const [isProcessing, setIsProcessing] = useState(true);

    useEffect(() => {
        const handleAuthCallback = async () => {
            const supabase = createClient();

            // Wait for auth state change to ensure OAuth callback is fully processed
            const waitForSession = new Promise<{ session: any; userId: string }>((resolve, reject) => {
                // First try to get existing session
                supabase.auth.getSession().then(({ data: { session }, error }) => {
                    if (session?.user) {
                        resolve({ session, userId: session.user.id });
                        return;
                    }
                    
                    // If no session, wait for auth state change
                    const { data: { subscription } } = supabase.auth.onAuthStateChange(
                        async (event, session) => {
                            if (event === 'SIGNED_IN' && session?.user) {
                                subscription.unsubscribe();
                                // Small delay to ensure session is fully established
                                await new Promise(resolve => setTimeout(resolve, 500));
                                resolve({ session, userId: session.user.id });
                            } else if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
                                subscription.unsubscribe();
                                reject(new Error('Authentication failed'));
                            }
                        }
                    );
                    
                    // Timeout after 10 seconds
                    setTimeout(() => {
                        subscription.unsubscribe();
                        reject(new Error('Timeout waiting for authentication'));
                    }, 10000);
                });
            });

            let session: any;
            let userId: string;
            
            try {
                const result = await waitForSession;
                session = result.session;
                userId = result.userId;
            } catch (error: any) {
                console.error('Session error:', error);
                setStatus('Authentication failed. Redirecting...');
                setTimeout(() => router.push('/login'), 2000);
                return;
            }

            // Check if this is a new user by checking if they have a profile
            let { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('id, interests')
                .eq('id', userId)
                .maybeSingle();

            // If profile doesn't exist, create a basic one
            if (!profile && !profileError) {
                console.log('Profile does not exist, creating basic profile...');
                const { data: userData } = await supabase.auth.getUser();
                const fullName = userData?.user?.user_metadata?.full_name || 
                                 userData?.user?.user_metadata?.name || 
                                 userData?.user?.email?.split('@')[0] || 
                                 'User';
                
                const { error: createError } = await supabase
                    .from('profiles')
                    .insert({
                        id: userId,
                        full_name: fullName,
                        star_color: '#8E5BFF',
                        interests: []
                    });
                
                if (createError) {
                    console.error('Error creating profile:', createError);
                } else {
                    // Re-fetch the profile
                    const { data: newProfile } = await supabase
                        .from('profiles')
                        .select('id, interests')
                        .eq('id', userId)
                        .single();
                    profile = newProfile;
                }
            }

            // If profile doesn't exist or has no interests, treat as new user
            const isNewUser = !profile || !profile.interests || (profile.interests as string[]).length === 0;

            if (isNewUser) {
                try {
                    setStatus('Fetching your YouTube data...');
                    
                    // Small delay to ensure everything is ready
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    // Sync YouTube data
                    const { subsCount, likesCount } = await YouTubeService.syncYouTubeData(userId);
                    
                    console.log(`Synced ${subsCount} subscriptions and ${likesCount} liked videos`);
                    
                    // Wait a moment for data to be committed to database
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    // Directly check if data exists in database
                    const { data: checkSubs, error: subsCheckError } = await supabase
                        .from('youtube_subscriptions')
                        .select('id')
                        .eq('user_id', userId)
                        .limit(1);
                    const { data: checkLikes, error: likesCheckError } = await supabase
                        .from('youtube_liked_videos')
                        .select('id')
                        .eq('user_id', userId)
                        .limit(1);
                    
                    console.log('Direct check - Subs:', checkSubs?.length, 'Likes:', checkLikes?.length);
                    console.log('Check errors:', { subsCheckError, likesCheckError });
                    
                    // Use the sync counts as primary indicator - if sync says it saved data, trust it
                    const hasData = subsCount > 0 || likesCount > 0;
                    
                    if (!hasData) {
                        console.warn('No YouTube data synced. Counts:', { subsCount, likesCount, checkSubs: checkSubs?.length, checkLikes: checkLikes?.length });
                        setStatus('No YouTube data found. Skipping interest graph creation...');
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        router.push('/digital-dna');
                        return;
                    }
                    
                    console.log(`Proceeding with interest creation. Data counts: ${subsCount} subs, ${likesCount} likes`);
                    setStatus(`Found ${subsCount} subscriptions and ${likesCount} liked videos. Creating your interest graph...`);
                    
                    // Derive interests
                    console.log('Calling deriveInterests for user:', userId);
                    let interests: string[] = [];
                    try {
                        interests = await YouTubeService.deriveInterests(userId);
                        console.log('Successfully derived interests:', interests);
                    } catch (error: any) {
                        console.error('Failed to derive interests:', error);
                        setStatus(`Error creating interest graph: ${error.message}. Redirecting...`);
                        setTimeout(() => router.push('/digital-dna'), 3000);
                        return;
                    }
                    
                    // Verify interests were saved to profile
                    let retries = 0;
                    let profileInterests: string[] = [];
                    while (retries < 3 && profileInterests.length === 0) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        const { data: verifyProfile, error: verifyError } = await supabase
                            .from('profiles')
                            .select('interests')
                            .eq('id', userId)
                            .maybeSingle();
                        
                        if (verifyError) {
                            console.error('Error verifying profile:', verifyError);
                        }
                        
                        profileInterests = (verifyProfile?.interests as string[]) || [];
                        console.log(`Verification attempt ${retries + 1}:`, profileInterests);
                        
                        if (profileInterests.length === 0 && retries < 2) {
                            console.warn('Interests not found in profile, retrying derive_interests...');
                            try {
                                interests = await YouTubeService.deriveInterests(userId);
                            } catch (e) {
                                console.error('Retry failed:', e);
                            }
                        }
                        retries++;
                    }
                    
                    if (profileInterests.length === 0 && interests.length > 0) {
                        console.warn('Interests were derived but not saved. Using derived interests:', interests);
                        // Try to manually update the profile
                        const { error: manualUpdateError } = await supabase
                            .from('profiles')
                            .update({ interests })
                            .eq('id', userId);
                        
                        if (manualUpdateError) {
                            console.error('Manual update failed:', manualUpdateError);
                        } else {
                            profileInterests = interests;
                        }
                    }
                    
                    if (profileInterests.length === 0) {
                        console.error('Interests were not saved after multiple attempts');
                        setStatus('Interest graph creation completed, but verification failed. Redirecting...');
                    } else {
                        setStatus(`Created your interest graph with ${profileInterests.length} interests!`);
                    }
                    
                    // Small delay to show the message
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    // Redirect to digital-dna page to show the graph
                    router.push('/digital-dna');
                } catch (error: any) {
                    console.error('Error processing new user:', error);
                    setStatus(`Error: ${error.message || 'Failed to process your data'}. Redirecting...`);
                    // Still redirect, but to home page
                    setTimeout(() => router.push('/'), 3000);
                }
            } else {
                // Existing user, just redirect to home
                router.push('/');
            }
        };

        handleAuthCallback();
    }, [router]);

    return (
        <div className="callback-container">
            <div className="callback-loader">
                <div className="spinner"></div>
                <p>{status}</p>
            </div>

            <style jsx>{`
        .callback-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: #000;
        }
        
        .callback-loader {
          text-align: center;
          color: #fff;
        }
        
        .spinner {
          width: 48px;
          height: 48px;
          border: 3px solid rgba(255, 255, 255, 0.1);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        p {
          font-size: 16px;
          opacity: 0.8;
          max-width: 400px;
          margin: 0 auto;
        }
      `}</style>
        </div>
    );
}
