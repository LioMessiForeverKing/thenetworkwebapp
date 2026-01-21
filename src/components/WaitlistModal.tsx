'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import styles from './WaitlistModal.module.css';

interface WaitlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: 'dark' | 'light';
}

export default function WaitlistModal({ isOpen, onClose, theme = 'dark' }: WaitlistModalProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [school, setSchool] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      
      // Insert into waitlist table
      const { error: insertError } = await supabase
        .from('waitlist')
        .insert({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          school: school.trim() || null,
        });

      if (insertError) {
        throw insertError;
      }

      // Reset form
      setName('');
      setEmail('');
      setSchool('');
      
      // Close modal and immediately redirect to consent page
      onClose();
      router.push('/consent');
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div 
        className={styles.modal} 
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: theme === 'dark' ? '#ffffff' : '#000000',
          color: theme === 'dark' ? '#000000' : '#ffffff',
        }}
      >
        <button 
          className={styles.closeButton}
          onClick={onClose}
          style={{
            color: theme === 'dark' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.5)',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <h2 className={styles.title}>Join the Waitlist</h2>
        <p className={styles.subtitle}>
          Be among the first to experience TheNetwork
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={styles.input}
              style={{
                backgroundColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.1)',
                borderColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)',
                color: theme === 'dark' ? '#000000' : '#ffffff',
              }}
            />
          </div>

          <div className={styles.inputGroup}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={styles.input}
              style={{
                backgroundColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.1)',
                borderColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)',
                color: theme === 'dark' ? '#000000' : '#ffffff',
              }}
            />
          </div>

          <div className={styles.inputGroup}>
            <input
              type="text"
              placeholder="School (optional)"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              className={styles.input}
              style={{
                backgroundColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.1)',
                borderColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)',
                color: theme === 'dark' ? '#000000' : '#ffffff',
              }}
            />
          </div>

          {error && (
            <div className={styles.error} style={{ color: theme === 'dark' ? '#ef4444' : '#fca5a5' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className={styles.submitButton}
            style={{
              backgroundColor: theme === 'dark' ? '#000000' : '#ffffff',
              color: theme === 'dark' ? '#ffffff' : '#000000',
              opacity: isSubmitting ? 0.6 : 1,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            {isSubmitting ? 'Submitting...' : 'Join Waitlist'}
          </button>
        </form>
      </div>
    </div>
  );
}
