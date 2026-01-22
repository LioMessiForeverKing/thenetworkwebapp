'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function WaitlistReferralPage() {
  const router = useRouter();
  const params = useParams();
  const code = params?.code as string;
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid'>('loading');
  const [referrerName, setReferrerName] = useState<string | null>(null);

  useEffect(() => {
    const handleReferral = async () => {
      if (!code) {
        router.push('/');
        return;
      }

      const supabase = createClient();

      // Verify the referral code exists
      const { data: referrer, error } = await supabase
        .from('waitlist')
        .select('name, invite_code')
        .eq('invite_code', code.toUpperCase())
        .single();

      if (error || !referrer) {
        setStatus('invalid');
        // Redirect to home after showing invalid message
        setTimeout(() => {
          router.push('/');
        }, 2000);
        return;
      }

      // Valid code - store it and redirect
      setReferrerName(referrer.name?.split(' ')[0] || 'Someone');
      setStatus('valid');
      
      // Store the referral code in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('waitlist_referral_code', code.toUpperCase());
      }

      // Redirect to home page after brief delay
      setTimeout(() => {
        router.push('/');
      }, 1500);
    };

    handleReferral();
  }, [code, router]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#000000',
      color: '#ffffff',
      padding: '20px',
    }}>
      <div style={{ textAlign: 'center', maxWidth: '400px' }}>
        {status === 'loading' && (
          <p style={{ fontSize: '18px', opacity: 0.8 }}>Loading...</p>
        )}
        
        {status === 'valid' && (
          <>
            <div style={{ marginBottom: '24px' }}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" style={{ margin: '0 auto' }}>
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '12px' }}>
              {referrerName} invited you!
            </h1>
            <p style={{ fontSize: '16px', opacity: 0.8 }}>
              Redirecting you to join the waitlist...
            </p>
          </>
        )}
        
        {status === 'invalid' && (
          <>
            <div style={{ marginBottom: '24px' }}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" style={{ margin: '0 auto' }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '12px' }}>
              Invalid invite link
            </h1>
            <p style={{ fontSize: '16px', opacity: 0.8 }}>
              This invite code doesn&apos;t exist. Redirecting to home...
            </p>
          </>
        )}
      </div>
    </div>
  );
}
