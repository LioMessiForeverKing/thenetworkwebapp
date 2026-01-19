'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Menu from '@/components/Menu';
import { useAuth } from '@/contexts/AuthContext';
import styles from './page.module.css';

export default function NetworkProfilePage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    // Auth Redirect
    React.useEffect(() => {
        if (!loading && !user) {
            router.push('/');
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.loader}></div>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <div className={styles.wrapper}>
            <Menu />
            <div className={styles.content}>
                <h1 className={styles.title}>YOUR NETWORK PROFILE</h1>
                <p className={styles.comingSoon}>Coming Soon</p>
            </div>
        </div>
    );
}
