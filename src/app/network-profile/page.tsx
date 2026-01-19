'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Menu from '@/components/Menu';
import InviteModal from '@/components/InviteModal';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase';
import styles from './page.module.css';

// Types
interface ProfileData {
    id: string;
    full_name: string;
    avatar_url?: string;
    bio?: string;
    school?: string;
    location?: string;
    interests?: string[];
}

interface ProfileExtras {
    status_text?: string;
    working_on?: string;
}

interface InterestCluster {
    tag: string;
    friendCount: number;
    friends: ClusterFriend[];
}

interface ClusterFriend {
    id: string;
    name: string;
    avatar_url?: string;
}

// Helper to resolve avatar URL
const getAvatarUrl = (path?: string | null) => {
    if (!path) return undefined;
    if (path.startsWith('http')) return path;
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/profile-images/${path}`;
};

// Canonical tag normalization
const normalizeToCanonicalTag = (interest: string): string => {
    const lowerInterest = interest.toLowerCase().trim();
    
    const mappings: Record<string, string> = {
        'artificial intelligence': 'AI & Machine Learning',
        'ai': 'AI & Machine Learning',
        'machine learning': 'AI & Machine Learning',
        'physics': 'Physics',
        'quantum physics': 'Physics',
        'fitness': 'Fitness & Health',
        'health': 'Fitness & Health',
        'gym': 'Fitness & Health',
        'entrepreneurship': 'Entrepreneurship',
        'startups': 'Entrepreneurship',
        'business': 'Entrepreneurship',
        'coding': 'Software Development',
        'programming': 'Software Development',
        'software': 'Software Development',
        'music': 'Music',
        'gaming': 'Gaming',
        'philosophy': 'Philosophy',
        'art': 'Art & Design',
        'design': 'Art & Design',
        'photography': 'Photography',
        'travel': 'Travel',
        'reading': 'Books & Reading',
        'books': 'Books & Reading',
        'cooking': 'Cooking & Food',
        'food': 'Cooking & Food',
        'movies': 'Film & Cinema',
        'sports': 'Sports',
        'cycling': 'Cycling',
        'biking': 'Cycling',
        'hiking': 'Outdoors & Nature',
        'meditation': 'Mindfulness',
        'yoga': 'Mindfulness',
        'finance': 'Finance & Investing',
        'investing': 'Finance & Investing',
        'education': 'Education',
        'science': 'Science',
        'engineering': 'Engineering',
        'history': 'History',
        'comedy': 'Comedy & Entertainment',
        'documentaries': 'Documentaries',
        'diy and engineering': 'DIY & Engineering',
        'creative arts': 'Creative Arts',
        'environmental awareness': 'Environment',
        'social issues': 'Social Issues',
    };
    
    if (mappings[lowerInterest]) {
        return mappings[lowerInterest];
    }
    
    for (const [key, value] of Object.entries(mappings)) {
        if (lowerInterest.includes(key) || key.includes(lowerInterest)) {
            return value;
        }
    }
    
    return interest.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
};

export default function NetworkProfilePage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    
    // State
    const [profileData, setProfileData] = useState<ProfileData | null>(null);
    const [profileExtras, setProfileExtras] = useState<ProfileExtras>({});
    const [interestClusters, setInterestClusters] = useState<InterestCluster[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [selectedCluster, setSelectedCluster] = useState<InterestCluster | null>(null);
    
    // Editable fields
    const [statusText, setStatusText] = useState('');
    const [workingOn, setWorkingOn] = useState('');
    const [networkScore, setNetworkScore] = useState(0);
    const [connectionsCount, setConnectionsCount] = useState(0);

    // Auth Redirect
    useEffect(() => {
        if (!loading && !user) {
            router.push('/');
        }
    }, [user, loading, router]);

    // Load profile data
    const loadProfileData = useCallback(async () => {
        if (!user) return;
        
        setIsLoading(true);
        const supabase = createClient();
        
        try {
            // 1. Fetch profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url, bio, school, location, interests')
                .eq('id', user.id)
                .single();
            
            if (profile) {
                setProfileData(profile);
            }
            
            // 2. Fetch profile extras
            const { data: extras } = await supabase
                .from('user_profile_extras')
                .select('status_text, working_on')
                .eq('user_id', user.id)
                .maybeSingle();
            
            if (extras) {
                setProfileExtras(extras);
                setStatusText(extras.status_text || '');
                setWorkingOn(extras.working_on || '');
            }
            
            // 3. Calculate interest clusters and network score
            await calculateNetworkData(profile);
            
        } catch (error) {
            console.error('Error loading profile:', error);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    // Calculate network data (clusters + score)
    const calculateNetworkData = async (profile: ProfileData | null) => {
        if (!user || !profile) return;
        
        const supabase = createClient();
        
        try {
            // Get friend IDs
            const { data: connections } = await supabase
                .from('user_connections')
                .select('sender_id, receiver_id')
                .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
                .eq('status', 'accepted');
            
            let allConnections = connections || [];
            if (allConnections.length === 0) {
                const { data: friendRequests } = await supabase
                    .from('friend_requests')
                    .select('sender_id, receiver_id')
                    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
                    .eq('status', 'accepted');
                allConnections = friendRequests || [];
            }
            
            const friendIds = allConnections.map(conn => 
                conn.sender_id === user.id ? conn.receiver_id : conn.sender_id
            );
            
            setConnectionsCount(friendIds.length);
            
            // Get friend profiles
            let friendProfiles: any[] = [];
            if (friendIds.length > 0) {
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, full_name, avatar_url, interests')
                    .in('id', friendIds);
                friendProfiles = profiles || [];
            }
            
            // Calculate clusters
            const clusterMap = new Map<string, ClusterFriend[]>();
            
            const userCanonicalTags = new Set<string>();
            (profile.interests || []).forEach(interest => {
                userCanonicalTags.add(normalizeToCanonicalTag(interest));
            });
            
            friendProfiles.forEach(friend => {
                const friendInterests = friend.interests || [];
                friendInterests.forEach((interest: string) => {
                    const canonicalTag = normalizeToCanonicalTag(interest);
                    
                    if (userCanonicalTags.has(canonicalTag)) {
                        if (!clusterMap.has(canonicalTag)) {
                            clusterMap.set(canonicalTag, []);
                        }
                        const existingFriend = clusterMap.get(canonicalTag)!.find(f => f.id === friend.id);
                        if (!existingFriend) {
                            clusterMap.get(canonicalTag)!.push({
                                id: friend.id,
                                name: friend.full_name?.split(' ')[0] || 'Friend',
                                avatar_url: friend.avatar_url,
                            });
                        }
                    }
                });
            });
            
            const clusters: InterestCluster[] = Array.from(clusterMap.entries())
                .filter(([_, friends]) => friends.length >= 1)
                .map(([tag, friends]) => ({
                    tag,
                    friendCount: friends.length,
                    friends: friends.slice(0, 8),
                }))
                .sort((a, b) => b.friendCount - a.friendCount)
                .slice(0, 10);
            
            setInterestClusters(clusters);
            
            // Calculate Network Score
            let completeness = 0;
            if (profile.full_name) completeness += 20;
            if (profile.avatar_url) completeness += 20;
            if (profile.bio) completeness += 20;
            if (statusText || profileExtras.status_text) completeness += 20;
            if (workingOn || profileExtras.working_on) completeness += 20;
            
            const connectionScore = Math.min(40, friendIds.length * 2);
            const clustersScore = Math.min(30, clusters.length * 5);
            const profileScore = Math.min(30, completeness * 0.3);
            const finalScore = Math.min(100, connectionScore + clustersScore + profileScore);
            
            setNetworkScore(Math.round(finalScore));
            
        } catch (error) {
            console.error('Error calculating network data:', error);
        }
    };

    // Save profile extras
    const saveProfileExtras = async () => {
        if (!user) return;
        
        const supabase = createClient();
        
        try {
            await supabase
                .from('user_profile_extras')
                .upsert({
                    user_id: user.id,
                    status_text: statusText,
                    working_on: workingOn,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'user_id' });
            
            setProfileExtras({ status_text: statusText, working_on: workingOn });
        } catch (error) {
            console.error('Error saving profile extras:', error);
        }
    };

    const handleStatusBlur = () => {
        if (statusText !== profileExtras.status_text) {
            saveProfileExtras();
        }
    };

    const handleWorkingOnBlur = () => {
        if (workingOn !== profileExtras.working_on) {
            saveProfileExtras();
        }
    };

    // Load data on mount
    useEffect(() => {
        loadProfileData();
    }, [loadProfileData]);

    if (loading || isLoading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.loader}></div>
            </div>
        );
    }

    if (!user || !profileData) {
        return null;
    }

    const avatarUrl = getAvatarUrl(profileData.avatar_url);
    const displayName = profileData.full_name || 'User';
    const firstName = displayName.split(' ')[0];

    return (
        <div className={styles.wrapper}>
            <Menu />
            
            <div className={styles.threeColumnLayout}>
                {/* ============================================
                    LEFT COLUMN: Profile Overview
                    ============================================ */}
                <div className={styles.leftColumn}>
                    {/* Profile Image */}
                    {avatarUrl ? (
                        <img 
                            src={avatarUrl} 
                            alt={displayName} 
                            className={`${styles.profileImage} invert-media`}
                        />
                    ) : (
                        <div className={styles.profileImagePlaceholder}>
                            {displayName.charAt(0).toUpperCase()}
                        </div>
                    )}
                    
                    {/* Network Score Section */}
                    <div className={styles.statusSection}>
                        <div className={styles.statusLabel}>Network Score</div>
                        <div className={styles.networkScoreDisplay}>
                            <span className={styles.scoreNumber}>{networkScore}</span>
                            <span className={styles.scoreOutOf}>/100</span>
                        </div>
                        <div className={styles.scoreBreakdown}>
                            <span className={styles.breakdownItem}>{connectionsCount} connections</span>
                            <span className={styles.breakdownItem}>{interestClusters.length} clusters</span>
                        </div>
                    </div>
                    
                    {/* Currently Working On */}
                    <div className={styles.workingOnSection}>
                        <div className={styles.workingOnLabel}>Currently Working On</div>
                        <input
                            type="text"
                            className={styles.statusInput}
                            value={workingOn}
                            onChange={(e) => setWorkingOn(e.target.value.slice(0, 100))}
                            onBlur={handleWorkingOnBlur}
                            placeholder="I am building something that increases interactions between humans."
                            maxLength={100}
                        />
                    </div>
                    
                    {/* Action Links */}
                    <div className={styles.actionLinks}>
                        <button className={styles.actionLink}>View More Photos of {firstName}</button>
                        <button className={styles.actionLink}>View All {firstName}'s Friends</button>
                        <button className={styles.actionLink}>Send {firstName} a Message</button>
                    </div>
                </div>

                {/* ============================================
                    CENTER COLUMN: Information
                    ============================================ */}
                <div className={styles.centerColumn}>
                    <div className={styles.infoHeader}>Information</div>
                    
                    {/* Account Info */}
                    <div className={styles.infoSection}>
                        <div className={styles.infoSectionTitle}>Account Info</div>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Name:</span>
                            <span className={styles.infoValue}>{profileData.full_name || 'Tristan de Halleux'}</span>
                        </div>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Networks:</span>
                            <span className={styles.infoValue}>
                                <a href="#" className={styles.infoValueLink}>{profileData.school || 'Columbia'}</a>
                                {', '}
                                <a href="#" className={styles.infoValueLink}>TheNetwork</a>
                                {', '}
                                <a href="#" className={styles.infoValueLink}>{profileData.location || 'New York, NY'}</a>
                            </span>
                        </div>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Last Update:</span>
                            <span className={styles.infoValue}>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                    </div>
                    
                    {/* Basic Info */}
                    <div className={styles.infoSection}>
                        <div className={styles.infoSectionTitle}>Basic Info</div>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Sex:</span>
                            <span className={styles.infoValue}>Male</span>
                        </div>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Residence:</span>
                            <span className={styles.infoValue}>{profileData.location || 'New York, NY'}</span>
                        </div>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Birthday:</span>
                            <span className={styles.infoValue}>March 1, 2007</span>
                        </div>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Hometown:</span>
                            <span className={styles.infoValue}>San Francisco, CA</span>
                        </div>
                    </div>
                    
                    {/* Contact Info */}
                    <div className={styles.infoSection}>
                        <div className={styles.infoSectionTitle}>Contact Info</div>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Email:</span>
                            <span className={styles.infoValue}>
                                <a href="#" className={styles.infoValueLink}>tristandehalleux@gmail.com</a>
                            </span>
                        </div>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Number:</span>
                            <span className={styles.infoValue}>
                                <a href="#" className={styles.infoValueLink}>+14157579243</a>
                            </span>
                        </div>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Instagram:</span>
                            <span className={styles.infoValue}>
                                <a href="#" className={styles.infoValueLink}>t.ristan.de</a>
                            </span>
                        </div>
                    </div>
                    
                    {/* Personal Info */}
                    <div className={styles.infoSection}>
                        <div className={styles.infoSectionTitle}>Personal Info</div>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Activities:</span>
                            <span className={styles.infoValue}>lots of networking</span>
                        </div>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Interests:</span>
                            <span className={styles.infoValue}>
                                {profileData.interests?.join(', ') || 'entrepreneurship, education, documentaries, DIY and engineering, software development, philosophy, health and fitness, creative arts, environmental awareness, gaming, physics, comedy, artificial intelligence, history, social issues'}
                            </span>
                        </div>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Favorite Quote:</span>
                            <span className={styles.infoValue}>cur vivis si non vivis</span>
                        </div>
                    </div>
                    
                    {/* Education Info */}
                    <div className={styles.infoSection}>
                        <div className={styles.infoSectionTitle}>Education Info</div>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>College:</span>
                            <span className={styles.infoValue}>
                                <a href="#" className={styles.infoValueLink}>{profileData.school || 'Columbia University'}</a>
                            </span>
                        </div>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>High School:</span>
                            <span className={styles.infoValue}>UWC Dilijan</span>
                        </div>
                    </div>
                </div>

                {/* ============================================
                    RIGHT COLUMN: Interest Clusters
                    ============================================ */}
                <div className={styles.rightColumn}>
                    {interestClusters.length === 0 ? (
                        <div className={styles.clusterCard}>
                            <div className={styles.clusterHeader}>
                                <h3 className={styles.clusterName}>No clusters yet</h3>
                            </div>
                            <p className={styles.clusterSubtitle}>
                                Add more friends to see your interest clusters!
                            </p>
                        </div>
                    ) : (
                        interestClusters.map((cluster) => (
                            <div key={cluster.tag} className={styles.clusterCard}>
                                <div className={styles.clusterHeader}>
                                    <h3 className={styles.clusterName}>{cluster.tag} Friends</h3>
                                    <span className={styles.clusterFriendCount}>
                                        {cluster.friendCount} friends interested in {cluster.tag}
                                    </span>
                                </div>
                                
                                <div className={styles.clusterAvatars}>
                                    {cluster.friends.slice(0, 4).map((friend) => (
                                        <div key={friend.id} className={styles.avatarWithName}>
                                            {friend.avatar_url ? (
                                                <img
                                                    src={getAvatarUrl(friend.avatar_url)}
                                                    alt={friend.name}
                                                    className={`${styles.clusterAvatar} invert-media`}
                                                />
                                            ) : (
                                                <div className={styles.clusterAvatarPlaceholder}>
                                                    {friend.name.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <span className={styles.avatarName}>{friend.name}</span>
                                        </div>
                                    ))}
                                    {cluster.friendCount > 4 && (
                                        <div className={styles.avatarWithName}>
                                            <div className={styles.moreAvatars}>
                                                +{cluster.friendCount - 4}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                <button 
                                    className={styles.viewAllLink}
                                    onClick={() => setSelectedCluster(cluster)}
                                >
                                    See All
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Footer Bar */}
            <div className={styles.footerBar}>
                <div className={styles.footerLeft}>{displayName}'s Profile</div>
                <div className={styles.footerRight}>{profileData.location || 'New York'}</div>
            </div>

            {/* Invite Modal */}
            <InviteModal
                isOpen={showInviteModal}
                onClose={() => setShowInviteModal(false)}
            />

            {/* Cluster Friends Modal */}
            {selectedCluster && (
                <div className={styles.modalOverlay} onClick={() => setSelectedCluster(null)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>{selectedCluster.tag} Friends</h3>
                            <button 
                                className={styles.modalCloseButton}
                                onClick={() => setSelectedCluster(null)}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 6L6 18M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.friendsList}>
                                {selectedCluster.friends.map((friend) => (
                                    <div key={friend.id} className={styles.friendItem}>
                                        {friend.avatar_url ? (
                                            <img
                                                src={getAvatarUrl(friend.avatar_url)}
                                                alt={friend.name}
                                                className={`${styles.friendAvatar} invert-media`}
                                            />
                                        ) : (
                                            <div className={styles.clusterAvatarPlaceholder}>
                                                {friend.name.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div className={styles.friendInfo}>
                                            <p className={styles.friendName}>{friend.name}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
