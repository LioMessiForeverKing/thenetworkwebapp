'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';

export default function InvitePage() {
  const router = useRouter();
  const params = useParams();
  const code = params?.code as string;

  useEffect(() => {
    const handleInvite = async () => {
      console.log(`[InvitePage] Processing invite with code: ${code}`);
      if (!code) {
        console.warn(`[InvitePage] No code found in params, redirecting to /`);
        router.push('/');
        return;
      }

      const supabase = createClient();

      // Check if user is already logged in
      const { data: { session } } = await supabase.auth.getSession();
      console.log(`[InvitePage] Current session check: ${session ? 'User logged in' : 'No user logged in'}`);

      if (session) {
        // User is logged in, redirect to network page
        // The referral will be tracked when they complete onboarding (if new) or we can track it here
        router.push('/network');
      } else {
        // User is not logged in, store the referral code and redirect to consent
        // Store in localStorage so we can retrieve it after signup
        console.log(`[InvitePage] Storing referral_code: ${code} and redirecting to /consent`);
        localStorage.setItem('referral_code', code);
        router.push('/consent');
      }
    };

    handleInvite();
  }, [code, router]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#000000',
      color: '#ffffff'
    }}>
      <div style={{ textAlign: 'center' }}>
        <p>Redirecting...</p>
      </div>
    </div>
  );
}

