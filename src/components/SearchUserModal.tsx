'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import styles from './SearchUserModal.module.css';

interface SearchResult {
  id: string;
  full_name: string;
  username?: string;
  avatar_url?: string;
  bio?: string;
}

interface SearchUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestSent?: () => void;
}

const getAvatarUrl = (path?: string | null) => {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/profile-images/${path}`;
};

export default function SearchUserModal({ isOpen, onClose, onRequestSent }: SearchUserModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [existingConnections, setExistingConnections] = useState<Set<string>>(new Set());

  // Debounced search function
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setResults([]);
        setLoading(false);
        return;
      }

      const trimmedQuery = query.trim();
      const searchPattern = `%${trimmedQuery}%`;

      // Search by full_name or username (case-insensitive)
      // Try using or() first, fallback to separate queries if needed
      let profiles: SearchResult[] = [];
      let error: any = null;

      // Try the or() query first
      const { data: orResults, error: orError } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .neq('id', user.id)
        .or(`full_name.ilike.${searchPattern},username.ilike.${searchPattern}`)
        .limit(10);

      if (orError) {
        // Fallback: search both fields separately and combine
        const [nameResults, usernameResults] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, full_name, username, avatar_url')
            .neq('id', user.id)
            .ilike('full_name', searchPattern)
            .limit(10),
          supabase
            .from('profiles')
            .select('id, full_name, username, avatar_url')
            .neq('id', user.id)
            .not('username', 'is', null)
            .ilike('username', searchPattern)
            .limit(10)
        ]);

        // Combine results and remove duplicates
        const nameProfiles = nameResults.data || [];
        const usernameProfiles = usernameResults.data || [];
        const combined = [...nameProfiles, ...usernameProfiles];
        
        // Remove duplicates by id
        const uniqueProfiles = combined.filter((profile, index, self) =>
          index === self.findIndex(p => p.id === profile.id)
        );
        
        profiles = uniqueProfiles.slice(0, 10);
        error = nameResults.error || usernameResults.error;
      } else {
        profiles = orResults || [];
      }

      if (error) {
        setResults([]);
        setLoading(false);
        return;
      }

      setResults(profiles);
    } catch (error) {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce search input
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setResults([]);
      return;
    }

    const timer = setTimeout(() => {
      performSearch(searchQuery);
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery, isOpen, performSearch]);

  // Check existing connections and sent requests when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const checkExistingConnections = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      try {
        // Check accepted connections
        const { data: connections } = await supabase
          .from('user_connections')
          .select('sender_id, receiver_id')
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .eq('status', 'accepted');

        if (connections) {
          const connectedIds = new Set<string>();
          connections.forEach(conn => {
            if (conn.sender_id === user.id) {
              connectedIds.add(conn.receiver_id);
            } else {
              connectedIds.add(conn.sender_id);
            }
          });
          setExistingConnections(connectedIds);
        }

        // Check pending sent requests
        const { data: sentRequestsData } = await supabase
          .from('friend_requests')
          .select('receiver_id')
          .eq('sender_id', user.id)
          .eq('status', 'pending');

        if (sentRequestsData) {
          setSentRequests(new Set(sentRequestsData.map(req => req.receiver_id)));
        }
      } catch (error) {
      }
    };

    checkExistingConnections();
  }, [isOpen]);

  const handleSendRequest = async (userId: string) => {
    if (sendingIds.has(userId) || sentRequests.has(userId) || existingConnections.has(userId)) {
      return;
    }

    setSendingIds(prev => new Set(prev).add(userId));
    const supabase = createClient();

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if request already exists (in case of race condition)
      const { data: existing } = await supabase
        .from('friend_requests')
        .select('id, status')
        .eq('sender_id', user.id)
        .eq('receiver_id', userId)
        .maybeSingle();

      if (existing) {
        if (existing.status === 'pending') {
          setSentRequests(prev => new Set(prev).add(userId));
        }
        setSendingIds(prev => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
        return;
      }

      // Send friend request
      const { error } = await supabase
        .from('friend_requests')
        .insert({
          sender_id: user.id,
          receiver_id: userId,
          status: 'pending'
        });

      if (error) {
        return;
      }

      // Update sent requests set
      setSentRequests(prev => new Set(prev).add(userId));
      
      // Notify parent if callback provided
      if (onRequestSent) {
        onRequestSent();
      }
    } catch (error) {
    } finally {
      setSendingIds(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const getButtonText = (userId: string) => {
    if (sendingIds.has(userId)) {
      return 'Sending...';
    }
    if (sentRequests.has(userId)) {
      return 'Request Sent';
    }
    if (existingConnections.has(userId)) {
      return 'Already Friends';
    }
    return 'Send Request';
  };

  const isButtonDisabled = (userId: string) => {
    return sendingIds.has(userId) || sentRequests.has(userId) || existingConnections.has(userId);
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Find People</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div className={styles.content}>
          <div className={styles.searchContainer}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search by name or username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>

          {loading && (
            <div className={styles.loading}>Searching...</div>
          )}

          {!loading && searchQuery.trim() && results.length === 0 && (
            <div className={styles.empty}>No users found</div>
          )}

          {!loading && !searchQuery.trim() && (
            <div className={styles.empty}>Type a name or username to search</div>
          )}

          {!loading && results.length > 0 && (
            <div className={styles.resultsList}>
              {results.map((user) => {
                const isProcessing = sendingIds.has(user.id);
                const isSent = sentRequests.has(user.id);
                const isConnected = existingConnections.has(user.id);
                
                return (
                  <div key={user.id} className={styles.resultCard}>
                    <div className={styles.userInfo}>
                      <img
                        src={getAvatarUrl(user.avatar_url) || '/assets/onboarding/tn_logo_black.png'}
                        alt={user.full_name}
                        className={styles.avatar}
                      />
                      <div className={styles.userDetails}>
                        <div className={styles.userName}>{user.full_name}</div>
                        {user.username && (
                          <div className={styles.username}>@{user.username}</div>
                        )}
                        {user.bio && (
                          <div className={styles.userBio}>{user.bio}</div>
                        )}
                      </div>
                    </div>
                    <button
                      className={`${styles.sendButton} ${
                        isSent ? styles.sentButton : 
                        isConnected ? styles.connectedButton : 
                        styles.defaultButton
                      }`}
                      onClick={() => handleSendRequest(user.id)}
                      disabled={isButtonDisabled(user.id)}
                    >
                      {getButtonText(user.id)}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

