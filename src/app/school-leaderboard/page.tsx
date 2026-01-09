'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase';
import Menu from '@/components/Menu';
import styles from './page.module.css';

export interface SchoolLeaderboardEntry {
  school_name: string;
  user_count: number;
  rank: number;
}

export default function SchoolLeaderboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [leaderboard, setLeaderboard] = useState<SchoolLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadLeaderboard();
    }
  }, [user]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push('/');
        return;
      }

      const response = await fetch('/api/school-leaderboard');
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }

      const data = await response.json();
      setLeaderboard(data.leaderboard || []);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <>
        <Menu />
        <div className={styles.container}>
          <div className={styles.loading}>Loading...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Menu />
      <div className={styles.container}>
        <div className={styles.content}>
          <h1 className={styles.title}>School Leaderboard</h1>
          <p className={styles.subtitle}>See which schools have the most users on TheNetwork</p>

          {/* Leaderboard List */}
          <div className={styles.leaderboard}>
            {leaderboard.length === 0 ? (
              <div className={styles.empty}>No schools yet. Be the first!</div>
            ) : (
              leaderboard.map((entry, index) => (
                <div
                  key={`${entry.school_name}-${index}`}
                  className={styles.leaderboardItem}
                >
                  <div className={styles.rank}>
                    {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                  </div>
                  <div className={styles.schoolInfo}>
                    <div className={styles.schoolName}>{entry.school_name}</div>
                  </div>
                  <div className={styles.count}>
                    <div className={styles.countValue}>{entry.user_count}</div>
                    <div className={styles.countLabel}>
                      {entry.user_count === 1 ? 'user' : 'users'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
