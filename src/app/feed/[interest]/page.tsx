'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Menu from '@/components/Menu';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase';
import parentStyles from '@/app/network-profile/page.module.css';
import styles from './page.module.css';

const getAvatarUrl = (path?: string | null) => {
    if (!path) return undefined;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) return undefined;
    return `${supabaseUrl}/storage/v1/object/public/profile-images/${path}`;
};

interface AuthorInfo {
    full_name: string;
    avatar_url?: string | null;
}

interface Post {
    id: string;
    user_id: string;
    interest: string;
    body: string;
    created_at: string;
}

export default function GlobalInterestFeedPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const interestParam = (params?.interest as string) || '';

    const [posts, setPosts] = useState<Post[]>([]);
    const [authors, setAuthors] = useState<Record<string, AuthorInfo>>({});
    const [loading, setLoading] = useState(true);
    const [composerBody, setComposerBody] = useState('');
    const [posting, setPosting] = useState(false);

    const interest = decodeURIComponent(interestParam);

    // Auth redirect
    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/');
        }
    }, [user, authLoading, router]);

    const fetchPosts = useCallback(async () => {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('interest_feed_posts')
            .select('id, user_id, interest, body, created_at')
            .eq('interest', interest)
            .order('created_at', { ascending: false });
        if (!error) {
            setPosts(data || []);
            // Fetch author profiles for all unique user_ids
            const userIds = [...new Set((data || []).map((p) => p.user_id))];
            if (userIds.length > 0) {
                const { data: profs } = await supabase
                    .from('profiles')
                    .select('id, full_name, avatar_url')
                    .in('id', userIds);
                const map: Record<string, AuthorInfo> = {};
                (profs || []).forEach((p: { id: string; full_name: string; avatar_url?: string | null }) => {
                    map[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url };
                });
                setAuthors(map);
            } else {
                setAuthors({});
            }
        }
    }, [interest]);

    useEffect(() => {
        if (!interest) return;
        setLoading(true);
        fetchPosts().finally(() => setLoading(false));
    }, [interest, fetchPosts]);

    const handlePost = async () => {
        if (!user || !composerBody.trim() || posting) return;
        setPosting(true);
        const supabase = createClient();
        const { error } = await supabase.from('interest_feed_posts').insert({
            user_id: user.id,
            interest,
            body: composerBody.trim(),
        });
        if (!error) {
            setComposerBody('');
            await fetchPosts();
        }
        setPosting(false);
    };

    if (authLoading) {
        return (
            <div className={parentStyles.wrapper}>
                <Menu />
                <div className={parentStyles.loadingContainer}>
                    <div className={parentStyles.loader} />
                </div>
            </div>
        );
    }

    if (!interest) {
        return (
            <div className={parentStyles.wrapper}>
                <Menu />
                <div className={parentStyles.loadingContainer}>
                    <p style={{ color: 'rgba(255,255,255,0.7)' }}>Invalid interest.</p>
                    <Link href="/network-profile/me" style={{ color: '#fff', marginTop: 16 }}>
                        Back to your profile
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className={parentStyles.wrapper}>
            <Menu />
            <div style={{ padding: '80px 24px 100px', maxWidth: 720, margin: '0 auto' }}>
                <Link href="/network-profile/me" className={styles.backLink}>
                    ← Back to profile
                </Link>

                <div className={styles.feedHeader}>
                    <h1 className={styles.feedTitle}>{interest} feed</h1>
                </div>

                {loading ? (
                    <div className={parentStyles.loadingContainer} style={{ minHeight: 120 }}>
                        <div className={parentStyles.loader} />
                    </div>
                ) : (
                    <div className={styles.feedContainer}>
                        {user && (
                            <div className={styles.composer}>
                                <label className={styles.composerLabel}>Post a thought about {interest}</label>
                                <textarea
                                    className={styles.composerTextarea}
                                    placeholder="e.g. Has anyone watched Air Crash Investigation? I'm a pilot — if you're in NY, happy to take you for a ride."
                                    value={composerBody}
                                    onChange={(e) => setComposerBody(e.target.value)}
                                    maxLength={2000}
                                />
                                <button
                                    className={styles.postButton}
                                    onClick={handlePost}
                                    disabled={!composerBody.trim() || posting}
                                >
                                    {posting ? 'Posting…' : 'Post'}
                                </button>
                            </div>
                        )}

                        {posts.length === 0 ? (
                            <p className={styles.emptyFeed}>
                                No posts yet. Share a thought about {interest}!
                            </p>
                        ) : (
                            <div className={styles.feedList}>
                                {posts.map((p) => {
                                    const author = authors[p.user_id];
                                    const name = author?.full_name || 'Unknown';
                                    const avatarUrl = author?.avatar_url;
                                    return (
                                        <article key={p.id} className={styles.feedPost}>
                                            <div className={styles.feedPostMeta}>
                                                {avatarUrl ? (
                                                    <img
                                                        src={getAvatarUrl(avatarUrl) || ''}
                                                        alt=""
                                                        className={styles.feedPostAvatar}
                                                        referrerPolicy="no-referrer"
                                                    />
                                                ) : (
                                                    <div className={styles.feedPostAvatarPlaceholder}>
                                                        {name.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <div>
                                                    <span className={styles.feedPostAuthor}>{name}</span>
                                                    <span className={styles.feedPostTime}>
                                                        {' · '}
                                                        {new Date(p.created_at).toLocaleDateString(undefined, {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric',
                                                            hour: 'numeric',
                                                            minute: '2-digit',
                                                        })}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className={styles.feedPostBody}>{p.body}</div>
                                        </article>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
