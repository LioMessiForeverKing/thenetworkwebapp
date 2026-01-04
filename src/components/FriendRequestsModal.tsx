'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import styles from './FriendRequestsModal.module.css';

interface FriendRequest {
  id: number;
  sender_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
  sender_profile?: {
    id: string;
    full_name: string;
    avatar_url?: string;
    bio?: string;
  };
}

interface FriendRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestAccepted?: () => void;
}

const getAvatarUrl = (path?: string | null) => {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/profile-images/${path}`;
};

export default function FriendRequestsModal({ isOpen, onClose, onRequestAccepted }: FriendRequestsModalProps) {
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (isOpen) {
      loadFriendRequests();
    }
  }, [isOpen]);

  const loadFriendRequests = async () => {
    setLoading(true);
    const supabase = createClient();
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch pending friend requests where current user is the receiver
      const { data: friendRequests, error } = await supabase
        .from('friend_requests')
        .select('*')
        .eq('receiver_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        setRequests([]);
        setLoading(false);
        return;
      }

      // Fetch sender profiles
      if (friendRequests && friendRequests.length > 0) {
        const senderIds = friendRequests.map(req => req.sender_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, bio')
          .in('id', senderIds);

        // Map profiles to requests
        const requestsWithProfiles = friendRequests.map(req => ({
          ...req,
          sender_profile: profiles?.find(p => p.id === req.sender_id)
        }));

        setRequests(requestsWithProfiles);
      } else {
        setRequests([]);
      }
    } catch (error) {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (requestId: number, senderId: string) => {
    if (processingIds.has(requestId)) return;
    
    setProcessingIds(prev => new Set(prev).add(requestId));
    const supabase = createClient();

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update friend request status to accepted
      const { error: updateError } = await supabase
        .from('friend_requests')
        .update({
          status: 'accepted',
          responded_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .eq('receiver_id', user.id);

      if (updateError) {
        return;
      }

      // Create or update user_connection (for network graph)
      // Note: RLS policy only allows inserts where current user is sender,
      // so we create with current user as sender and the other person as receiver
      // First check if connection exists in either direction
      const { data: existingConns1 } = await supabase
        .from('user_connections')
        .select('id, sender_id, receiver_id, status')
        .eq('sender_id', senderId)
        .eq('receiver_id', user.id);
      
      const { data: existingConns2 } = await supabase
        .from('user_connections')
        .select('id, sender_id, receiver_id, status')
        .eq('sender_id', user.id)
        .eq('receiver_id', senderId);
      
      const existingConns = [...(existingConns1 || []), ...(existingConns2 || [])];

      if (existingConns && existingConns.length > 0) {
        // Update existing connection to accepted
        const existingConn = existingConns[0];
        const { error: updateConnError } = await supabase
          .from('user_connections')
          .update({
            status: 'accepted',
            responded_at: new Date().toISOString()
          })
          .eq('id', existingConn.id);

        if (updateConnError) {
          // Continue anyway - the friend request is accepted
        }
      } else {
        // Create new connection with current user as sender (to pass RLS)
        // When accepting, we create: current_user -> sender (who sent the request)
        const { error: connError } = await supabase
          .from('user_connections')
          .insert({
            sender_id: user.id,
            receiver_id: senderId,
            status: 'accepted',
            created_at: new Date().toISOString()
          });

        if (connError) {
          // Continue anyway - the friend request is accepted
        }
      }

      // Remove from list
      setRequests(prev => prev.filter(req => req.id !== requestId));
      
      // Notify parent to refresh network
      if (onRequestAccepted) {
        onRequestAccepted();
      }
    } catch (error) {
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  };

  const handleDecline = async (requestId: number) => {
    if (processingIds.has(requestId)) return;
    
    setProcessingIds(prev => new Set(prev).add(requestId));
    const supabase = createClient();

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update friend request status to declined
      const { error } = await supabase
        .from('friend_requests')
        .update({
          status: 'declined',
          responded_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .eq('receiver_id', user.id);

      if (error) {
        return;
      }

      // Remove from list
      setRequests(prev => prev.filter(req => req.id !== requestId));
    } catch (error) {
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Friend Requests</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div className={styles.content}>
          {loading ? (
            <div className={styles.loading}>Loading...</div>
          ) : requests.length === 0 ? (
            <div className={styles.empty}>No pending friend requests</div>
          ) : (
            <div className={styles.requestsList}>
              {requests.map((request) => {
                const profile = request.sender_profile;
                const isProcessing = processingIds.has(request.id);
                
                return (
                  <div key={request.id} className={styles.requestCard}>
                    <div className={styles.requestInfo}>
                      <img
                        src={getAvatarUrl(profile?.avatar_url) || '/assets/onboarding/tn_logo_black.png'}
                        alt={profile?.full_name || 'User'}
                        className={styles.avatar}
                      />
                      <div className={styles.userInfo}>
                        <div className={styles.userName}>
                          {profile?.full_name?.split(' ')[0] || 'Unknown User'}
                        </div>
                        {profile?.bio && (
                          <div className={styles.userBio}>{profile.bio}</div>
                        )}
                      </div>
                    </div>
                    <div className={styles.actions}>
                      <button
                        className={styles.acceptButton}
                        onClick={() => handleAccept(request.id, request.sender_id)}
                        disabled={isProcessing}
                      >
                        {isProcessing ? '...' : 'Accept'}
                      </button>
                      <button
                        className={styles.declineButton}
                        onClick={() => handleDecline(request.id)}
                        disabled={isProcessing}
                      >
                        {isProcessing ? '...' : 'Decline'}
                      </button>
                    </div>
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

