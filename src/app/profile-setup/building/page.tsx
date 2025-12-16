'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { YouTubeService } from '@/services/youtube';

const STATUS_MESSAGES = [
    'Syncing your YouTube data...',
    'Analyzing your subscriptions...',
    'Finding your interests...',
    'Building your Digital DNA...',
    'Almost there...',
];

export default function BuildingPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    const [statusIndex, setStatusIndex] = useState(0);
    const [isComplete, setIsComplete] = useState(false);
    const [error, setError] = useState('');

    // Redirect if not authenticated
    useEffect(() => {
        if (!loading && !user) {
            router.push('/landing');
        }
    }, [user, loading, router]);

    // Cycle through status messages
    useEffect(() => {
        const interval = setInterval(() => {
            setStatusIndex(prev => {
                if (prev < STATUS_MESSAGES.length - 1) {
                    return prev + 1;
                }
                return prev;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    // Process DNA in the background
    useEffect(() => {
        if (!user) return;

        const processDNA = async () => {
            try {
                // Step 1: Sync YouTube data
                const { subsCount, likesCount } = await YouTubeService.syncYouTubeData(user.id);
                console.log(`Synced ${subsCount} subscriptions and ${likesCount} liked videos`);

                // Step 2: Derive interests (this calls the edge function)
                if (subsCount > 0 || likesCount > 0) {
                    await YouTubeService.deriveInterests(user.id);
                    console.log('Interests derived successfully');
                }

                // Wait a minimum of 4 seconds for the animation to complete
                await new Promise(resolve => setTimeout(resolve, 2000));

                setIsComplete(true);

                // Redirect after a brief success state
                setTimeout(() => {
                    router.push('/profile-setup/wrapped');
                }, 1500);

            } catch (err: any) {
                console.error('Error processing DNA:', err);
                // Don't block the user - still redirect even if there's an error
                setError('Some data could not be processed');

                setTimeout(() => {
                    router.push('/profile-setup/wrapped');
                }, 2000);
            }
        };

        // Start processing after a brief delay
        const timeout = setTimeout(processDNA, 500);
        return () => clearTimeout(timeout);
    }, [user, router]);

    if (loading) {
        return (
             <div className="flex items-center justify-center min-h-screen bg-white">
                <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white flex flex-col items-center py-12 px-4 relative overflow-hidden">
             {/* Progress Bar Container */}
             <div className="w-full max-w-[600px] flex flex-col gap-2 mb-12">
                 <div className="flex justify-between items-end mb-2">
                     <span className="text-[15px] font-normal text-black font-display">Build your Digital DNA</span>
                     <span className="text-[15px] font-normal text-black font-display">100%</span>
                 </div>
                 <div className="w-full h-[10px] bg-white border border-black relative">
                     <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-b from-[#252525] to-[#454545]"></div>
                 </div>
             </div>

             {/* Animation Area */}
             <div className="flex-1 flex flex-col items-center justify-center w-full max-w-[600px] text-center">
                 <div className="relative w-64 h-64 flex items-center justify-center mb-8">
                     {isComplete ? (
                         <div className="text-green-500 animate-bounce">
                             <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                             </svg>
                         </div>
                     ) : (
                         <div className="relative w-32 h-32">
                             <div className="absolute top-0 left-0 w-full h-full border-4 border-gray-200 rounded-full"></div>
                             <div className="absolute top-0 left-0 w-full h-full border-4 border-black border-t-transparent rounded-full animate-spin"></div>
                         </div>
                     )}
                 </div>
                 
                 <h2 className="text-[30px] font-bold text-black font-display mb-4">
                    {isComplete ? 'DNA Created!' : 'Constructing your Digital DNA'}
                 </h2>
                 <p className="text-[16px] text-gray-600 font-display">
                    {isComplete ? 'Taking you to your network...' : STATUS_MESSAGES[statusIndex]}
                 </p>
                 {error && <p className="text-red-500 mt-4 font-display">{error}</p>}
             </div>
        </div>
    );
}
