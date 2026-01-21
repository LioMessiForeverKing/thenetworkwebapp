'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase';
import { getReferralStats, ReferralStats } from '@/services/referral';

// Generate a consistent color for a user based on their ID
function getUserColor(userId: string): { r: number; g: number; b: number } {
    // Simple hash function to convert user ID to a number
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
        hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Generate HSL color with fixed saturation and lightness for good visibility
    const hue = Math.abs(hash) % 360;
    // Use high saturation (70-100%) and medium lightness (50-70%) for vibrant colors
    const saturation = 70 + (Math.abs(hash) % 30); // 70-100%
    const lightness = 50 + (Math.abs(hash >> 8) % 20); // 50-70%
    
    // Convert HSL to RGB
    const h = hue / 360;
    const s = saturation / 100;
    const l = lightness / 100;
    
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h * 6) % 2 - 1));
    const m = l - c / 2;
    
    let r = 0, g = 0, b = 0;
    
    if (h < 1/6) {
        r = c; g = x; b = 0;
    } else if (h < 2/6) {
        r = x; g = c; b = 0;
    } else if (h < 3/6) {
        r = 0; g = c; b = x;
    } else if (h < 4/6) {
        r = 0; g = x; b = c;
    } else if (h < 5/6) {
        r = x; g = 0; b = c;
    } else {
        r = c; g = 0; b = x;
    }
    
    return {
        r: Math.round((r + m) * 255),
        g: Math.round((g + m) * 255),
        b: Math.round((b + m) * 255)
    };
}

// Simple single-node graph component (Obsidian style)
function LonelyGraph({ avatarUrl, name, userId }: { avatarUrl: string | null; name: string; userId: string }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const animationRef = useRef<number | undefined>(undefined);
    const timeRef = useRef(0);
    const userColor = getUserColor(userId);
    const [hoveredNodeIndex, setHoveredNodeIndex] = useState<number | null>(null);
    const [clickedNodeIndex, setClickedNodeIndex] = useState<number | null>(null);
    const ghostNodePositionsRef = useRef<Array<{ x: number; y: number; size: number }>>([]);

    useEffect(() => {
        const updateDimensions = () => {
            if (canvasRef.current?.parentElement) {
                const rect = canvasRef.current.parentElement.getBoundingClientRect();
                setDimensions({ width: rect.width, height: rect.height });
            }
        };

        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || dimensions.width === 0) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size with device pixel ratio for crisp rendering
        const dpr = window.devicePixelRatio || 1;
        canvas.width = dimensions.width * dpr;
        canvas.height = dimensions.height * dpr;
        ctx.scale(dpr, dpr);

        const centerX = dimensions.width / 2;
        const centerY = dimensions.height / 2;
        const nodeRadius = 40;

        // Load avatar image
        let avatarImage: HTMLImageElement | null = null;
        if (avatarUrl) {
            avatarImage = new Image();
            avatarImage.crossOrigin = 'anonymous';
            avatarImage.src = avatarUrl;
        }

        // Generate ghost nodes (potential connections) - 20 nodes with more randomization
        const ghostNodes: { angle: number; angleOffset: number; distance: number; size: number; opacity: number; speed: number; speedVariation: number }[] = [];
        for (let i = 0; i < 20; i++) {
            ghostNodes.push({
                angle: (i / 20) * Math.PI * 2,
                angleOffset: (Math.random() - 0.5) * 0.3, // Random offset to break perfect circle
                distance: 100 + Math.random() * 120, // More varied distances
                size: 12 + Math.random() * 15, // More size variation
                opacity: 0.08 + Math.random() * 0.2, // More opacity variation
                speed: 0.0003 + Math.random() * 0.0015, // More speed variation
                speedVariation: 0.5 + Math.random() * 0.5 // Additional speed variation factor
            });
        }

        const draw = () => {
            timeRef.current += 1;
            ctx.clearRect(0, 0, dimensions.width, dimensions.height);

            // Draw background dots (Obsidian style)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
            const dotSpacing = 30;
            for (let x = 0; x < dimensions.width; x += dotSpacing) {
                for (let y = 0; y < dimensions.height; y += dotSpacing) {
                    ctx.beginPath();
                    ctx.arc(x, y, 1, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // Store positions for interaction
            ghostNodePositionsRef.current = [];

            // Draw ghost connection lines (dashed, faint)
            ghostNodes.forEach((ghost, i) => {
                // More complex movement with multiple sine waves for organic motion
                const baseAngle = ghost.angle + ghost.angleOffset;
                const timeFactor = timeRef.current * ghost.speed * ghost.speedVariation;
                const currentAngle = baseAngle + timeFactor;
                
                // Multiple breathing effects for more organic movement
                const breathe1 = Math.sin(timeRef.current * 0.02 + i) * 8;
                const breathe2 = Math.cos(timeRef.current * 0.015 + i * 0.7) * 5;
                const breathe3 = Math.sin(timeRef.current * 0.03 + i * 1.3) * 3;
                const totalBreathe = breathe1 + breathe2 + breathe3;
                
                // Add some random drift
                const driftX = Math.sin(timeRef.current * 0.01 + i * 2) * 15;
                const driftY = Math.cos(timeRef.current * 0.01 + i * 2) * 15;
                
                const x = centerX + Math.cos(currentAngle) * (ghost.distance + totalBreathe) + driftX;
                const y = centerY + Math.sin(currentAngle) * (ghost.distance + totalBreathe) + driftY;

                // Store position for interaction
                ghostNodePositionsRef.current.push({ x, y, size: ghost.size });

                // Check if hovered or clicked
                const isHovered = hoveredNodeIndex === i;
                const isClicked = clickedNodeIndex === i;
                const isInteractive = isHovered || isClicked;

                // Draw dashed line to ghost node
                ctx.beginPath();
                ctx.setLineDash([4, 8]);
                const lineOpacity = isInteractive ? ghost.opacity * 1.5 : ghost.opacity * 0.5;
                ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(lineOpacity, 0.8)})`;
                ctx.lineWidth = isInteractive ? 1.5 : 1;
                ctx.moveTo(centerX, centerY);
                ctx.lineTo(x, y);
                ctx.stroke();
                ctx.setLineDash([]);

                // Draw ghost node (empty circle) with interaction effects
                const nodeSize = isInteractive ? ghost.size * 1.3 : ghost.size;
                const nodeOpacity = isInteractive ? Math.min(ghost.opacity * 2, 0.6) : ghost.opacity;
                
                // Add glow effect when hovered/clicked
                if (isInteractive) {
                    const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, nodeSize * 2);
                    glowGradient.addColorStop(0, `rgba(255, 255, 255, ${nodeOpacity * 0.3})`);
                    glowGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                    ctx.fillStyle = glowGradient;
                    ctx.beginPath();
                    ctx.arc(x, y, nodeSize * 2, 0, Math.PI * 2);
                    ctx.fill();
                }

                ctx.beginPath();
                ctx.arc(x, y, nodeSize, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255, 255, 255, ${nodeOpacity})`;
                ctx.lineWidth = isInteractive ? 2 : 1;
                ctx.stroke();

                // Draw "?" in ghost node
                const textOpacity = isInteractive ? Math.min(ghost.opacity * 2.5, 0.9) : ghost.opacity * 0.7;
                ctx.fillStyle = `rgba(255, 255, 255, ${textOpacity})`;
                ctx.font = `bold ${nodeSize * 0.8}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('?', x, y);
            });

            // Draw main node glow with user's color
            const gradient = ctx.createRadialGradient(centerX, centerY, nodeRadius, centerX, centerY, nodeRadius * 2.5);
            gradient.addColorStop(0, `rgba(${userColor.r}, ${userColor.g}, ${userColor.b}, 0.3)`);
            gradient.addColorStop(1, `rgba(${userColor.r}, ${userColor.g}, ${userColor.b}, 0)`);
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(centerX, centerY, nodeRadius * 2.5, 0, Math.PI * 2);
            ctx.fill();

            // Draw main node border with user's color
            ctx.beginPath();
            ctx.arc(centerX, centerY, nodeRadius + 2, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${userColor.r}, ${userColor.g}, ${userColor.b}, 0.5)`;
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw main node background
            ctx.beginPath();
            ctx.arc(centerX, centerY, nodeRadius, 0, Math.PI * 2);
            ctx.fillStyle = '#1a1a1a';
            ctx.fill();

            // Draw avatar or initials
            if (avatarImage && avatarImage.complete && avatarImage.naturalWidth > 0) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(centerX, centerY, nodeRadius - 2, 0, Math.PI * 2);
                ctx.clip();
                ctx.drawImage(
                    avatarImage,
                    centerX - nodeRadius + 2,
                    centerY - nodeRadius + 2,
                    (nodeRadius - 2) * 2,
                    (nodeRadius - 2) * 2
                );
                ctx.restore();
            } else {
                // Draw initials
                const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 20px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(initials, centerX, centerY);
            }

            animationRef.current = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [dimensions, avatarUrl, name, userColor, hoveredNodeIndex, clickedNodeIndex]);

    // Mouse interaction handlers
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const handleMouseMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const mouseX = (e.clientX - rect.left) * scaleX;
            const mouseY = (e.clientY - rect.top) * scaleY;

            // Check if mouse is over any ghost node
            let foundIndex: number | null = null;
            ghostNodePositionsRef.current.forEach((pos, index) => {
                const dx = mouseX - pos.x;
                const dy = mouseY - pos.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance <= pos.size + 5) { // 5px padding for easier interaction
                    foundIndex = index;
                }
            });

            setHoveredNodeIndex(foundIndex);
            canvas.style.cursor = foundIndex !== null ? 'pointer' : 'default';
        };

        const handleMouseClick = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const mouseX = (e.clientX - rect.left) * scaleX;
            const mouseY = (e.clientY - rect.top) * scaleY;

            // Check if click is on any ghost node
            let foundIndex: number | null = null;
            ghostNodePositionsRef.current.forEach((pos, index) => {
                const dx = mouseX - pos.x;
                const dy = mouseY - pos.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance <= pos.size + 5) {
                    foundIndex = index;
                }
            });

            if (foundIndex !== null) {
                setClickedNodeIndex(foundIndex);
                // Reset after a moment
                setTimeout(() => setClickedNodeIndex(null), 300);
            }
        };

        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('click', handleMouseClick);

        return () => {
            canvas.removeEventListener('mousemove', handleMouseMove);
            canvas.removeEventListener('click', handleMouseClick);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%' }}
        />
    );
}

export default function InviteFriendsPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);
    const [stats, setStats] = useState<ReferralStats | null>(null);
    const [loadingData, setLoadingData] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/');
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (user) {
            loadData();
            // Store that user has visited this page (for easy return)
            localStorage.setItem('has_visited_invite_friends', 'true');
        }
    }, [user]);

    // Check friend count periodically and redirect if >= 3
    useEffect(() => {
        if (!user || loadingData) return;

        const checkFriendCount = async () => {
            const supabase = createClient();
            const { data: connections } = await supabase
                .from('user_connections')
                .select('sender_id, receiver_id')
                .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
                .eq('status', 'accepted');

            if (connections) {
                const friendIds = new Set<string>();
                connections.forEach(conn => {
                    const otherId = conn.sender_id === user.id ? conn.receiver_id : conn.sender_id;
                    friendIds.add(otherId);
                });
                
                if (friendIds.size >= 3) {
                    router.push('/network');
                }
            }
        };

        // Check immediately and then every 5 seconds
        checkFriendCount();
        const interval = setInterval(checkFriendCount, 5000);

        return () => clearInterval(interval);
    }, [user, loadingData, router]);

    const loadData = async () => {
        if (!user) return;
        setLoadingData(true);
        
        const supabase = createClient();
        
        // Fetch profile
        const { data: profileData } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('id', user.id)
            .single();
        
        setProfile(profileData);
        
        // Check total friend count from user_connections table
        const { data: connections, error: connectionsError } = await supabase
            .from('user_connections')
            .select('sender_id, receiver_id')
            .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
            .eq('status', 'accepted');
        
        // Count unique friends (extract the other user ID from each connection)
        let totalFriends = 0;
        if (connections && !connectionsError) {
            const friendIds = new Set<string>();
            connections.forEach(conn => {
                const otherId = conn.sender_id === user.id ? conn.receiver_id : conn.sender_id;
                friendIds.add(otherId);
            });
            totalFriends = friendIds.size;
        }
        
        // If user has 3+ friends, redirect to network page
        if (totalFriends >= 3) {
            router.push('/network');
            return;
        }
        
        // Fetch referral stats
        const referralStats = await getReferralStats(user.id);
        setStats(referralStats);
        
        setLoadingData(false);
    };

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push('/');
    };

    const copyToClipboard = async () => {
        if (!stats?.inviteLink) return;

        try {
            await navigator.clipboard.writeText(stats.inviteLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy:', error);
        }
    };

    const shareLink = async () => {
        if (!stats?.inviteLink) return;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Join The Network',
                    text: 'Join me on The Network - discover people who share your interests!',
                    url: stats.inviteLink
                });
            } catch (error) {
                // User cancelled or error occurred
                copyToClipboard();
            }
        } else {
            copyToClipboard();
        }
    };

    // Get avatar URL helper
    const getAvatarUrl = (path?: string | null) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/profile-images/${path}`;
    };

    if (loading || loadingData) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
        );
    }

    const avatarUrl = getAvatarUrl(profile?.avatar_url);
    const userColor = user ? getUserColor(user.id) : { r: 142, g: 91, b: 255 };

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex flex-col md:flex-row relative overflow-hidden">
            {/* Logout button - top right */}
            <button
                onClick={handleLogout}
                className="absolute top-4 right-4 md:top-6 md:right-6 z-50 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-sm font-medium transition-all"
            >
                Sign Out
            </button>

            {/* Graph area - left side on desktop, top on mobile */}
            <div className="flex-1 min-h-[40vh] md:min-h-screen md:w-1/2 relative">
                <LonelyGraph 
                    avatarUrl={avatarUrl} 
                    name={profile?.full_name || 'User'}
                    userId={user?.id || ''}
                />
            </div>

            {/* Content area - right side on desktop, bottom on mobile */}
            <div className="relative z-10 px-6 pb-8 pt-4 md:w-1/2 md:flex md:flex-col md:justify-center md:px-12 lg:px-16">
                <div className="max-w-md">
                    {/* Message */}
                    <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white mb-3 font-display">
                        Looks like you're alone here
                    </h1>
                    <p className="text-gray-400 text-base md:text-lg lg:text-xl mb-6 font-display">
                        Invite friends to grow your network
                    </p>

                    {/* Friends joined counter */}
                    {stats && (
                        <div className="mb-8 p-4 bg-white/5 border border-white/10 rounded-xl">
                            <div className="flex items-center gap-4">
                                <div className="flex-1">
                                    <div className="text-4xl md:text-5xl font-bold text-white">
                                        {stats.acceptedInvites}
                                    </div>
                                    <div className="text-sm text-gray-400 mt-1">
                                        {stats.acceptedInvites === 1 ? 'friend has' : 'friends have'} joined
                                    </div>
                                </div>
                                {stats.acceptedInvites < 3 && (
                                    <div className="text-right">
                                        <div className="text-sm text-gray-500">Goal</div>
                                        <div className="text-lg font-semibold text-white">{3 - stats.acceptedInvites} more</div>
                                    </div>
                                )}
                                {stats.acceptedInvites >= 3 && (
                                    <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                                        <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                            {/* Progress bar */}
                            <div className="mt-4 h-2 bg-white/10 rounded-full overflow-hidden">
                                <div 
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{ 
                                        width: `${Math.min((stats.acceptedInvites / 3) * 100, 100)}%`,
                                        background: `linear-gradient(to right, rgb(${userColor.r}, ${userColor.g}, ${userColor.b}), rgb(${Math.min(255, userColor.r + 30)}, ${Math.min(255, userColor.g + 30)}, ${Math.min(255, userColor.b + 30)}))`
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Invite link section */}
                    {stats?.inviteLink && (
                        <div className="w-full space-y-4">
                            {/* Link display */}
                            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                <div className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Your Invite Link</div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={stats.inviteLink}
                                        readOnly
                                        className="flex-1 bg-transparent text-white text-sm truncate outline-none"
                                    />
                                    <button
                                        onClick={copyToClipboard}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                            copied 
                                                ? 'bg-green-500/20 text-green-400' 
                                                : 'bg-white/10 text-white hover:bg-white/20'
                                        }`}
                                    >
                                        {copied ? 'Copied!' : 'Copy'}
                                    </button>
                                </div>
                            </div>

                            {/* Share button */}
                            <button
                                onClick={shareLink}
                                className="w-full py-4 bg-white text-black rounded-full font-semibold text-lg hover:bg-gray-100 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                            >
                                Share Invite Link
                            </button>

                            {/* Helper text */}
                            <p className="text-gray-500 text-sm">
                                When friends join using your link, you'll be automatically connected!
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
