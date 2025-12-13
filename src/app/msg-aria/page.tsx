'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Menu from '@/components/Menu';
import { useAuth } from '@/contexts/AuthContext';
import { AriaService } from '@/services/aria';
import { AriaMessage } from '@/types/aria';
import styles from './page.module.css';
import CandidateCard from '@/components/CandidateCard';
import { createClient } from '@/lib/supabase';

export default function MsgAriaPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [messages, setMessages] = useState<AriaMessage[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [connections, setConnections] = useState<Set<string>>(new Set());
    const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set());
    const isSending = useRef(false);

    // Scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    // Auth redirect
    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    // Load Pending Requests (Connections are now checked per candidate via AriaService)
    useEffect(() => {
        if (!user) return;
        const fetchPendingRequests = async () => {
            const supabase = createClient();
            try {
                // Fetch pending requests
                const { data: reqs } = await supabase
                    .from('friend_requests')
                    .select('receiver_id')
                    .eq('sender_id', user.id)
                    .eq('status', 'pending');

                if (reqs) {
                    setPendingRequests(new Set(reqs.map(r => r.receiver_id)));
                }
            } catch (e) {
                console.error("Error fetching pending requests:", e);
            }
        };
        fetchPendingRequests();
    }, [user]);

    // Load History
    useEffect(() => {
        if (!user) return;
        const loadHistory = async () => {
            const history = await AriaService.getHistory(user.id);

            // Deduplicate history
            const uniqueHistory = history.reduce((acc: any[], current: any) => {
                const isDuplicate = acc.find(item =>
                    (item.id && item.id === current.id) ||
                    (item.message === current.message &&
                        item.is_from_user === current.is_from_user &&
                        Math.abs(new Date(item.created_at).getTime() - new Date(current.created_at).getTime()) < 2000)
                );
                if (!isDuplicate) {
                    acc.push(current);
                }
                return acc;
            }, []);

            setMessages(uniqueHistory.map((msg: any) => ({
                id: msg.id,
                content: msg.message,
                isFromUser: msg.is_from_user,
                createdAt: msg.created_at,
                candidates: msg.candidates
            })));
        };
        loadHistory();
    }, [user]);

    const handleInvite = async (candidateId: string) => {
        if (!user) return;
        try {
            if (pendingRequests.has(candidateId)) return; // Only check pending requests locally
            const supabase = createClient();
            const { error } = await supabase
                .from('friend_requests')
                .insert({
                    sender_id: user.id,
                    receiver_id: candidateId,
                    status: 'pending'
                });

            if (!error) {
                setPendingRequests(prev => new Set(prev).add(candidateId));
            } else {
                console.error("Error sending invite:", error);
            }
        } catch (e) {
            console.error("Error sending invite:", e);
        }
    };

    const handleSkip = (candidateId: string) => {
        setMessages(prev => prev.map(msg => {
            if (msg.candidates) {
                return {
                    ...msg,
                    candidates: msg.candidates.filter(c => c.id !== candidateId)
                };
            }
            return msg;
        }));
    };

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || !user || isTyping || isSending.current) return;

        const userMsgContent = input.trim();

        // Simple dedupe: check if last message is identical
        if (messages.length > 0 && messages[messages.length - 1].content === userMsgContent && messages[messages.length - 1].isFromUser) {
            return;
        }

        setInput('');
        setIsTyping(true);
        isSending.current = true;

        // Optimistic UI update
        const newUserMsg: AriaMessage = {
            content: userMsgContent,
            isFromUser: true,
            createdAt: new Date().toISOString()
        };

        setMessages(prev => [...prev, newUserMsg]);

        try {
            // REMOVED manual storeMessage for usage, assuming backend handles it to prevent duplicates
            // await AriaService.storeMessage(user.id, userMsgContent, true);

            const apiHistory = messages.slice(-10).map(m => ({
                role: m.isFromUser ? 'user' : 'assistant',
                content: m.content
            }));

            const result = await AriaService.sendMessage(userMsgContent, apiHistory);

            if (result && (result.response || (result.candidates && result.candidates.length > 0))) {
                const ariaMsg: AriaMessage = {
                    content: result.response || '',
                    isFromUser: false,
                    createdAt: new Date().toISOString(),
                    candidates: result.candidates
                };
                setMessages(prev => [...prev, ariaMsg]);

                // REMOVED manual storeMessage for response as well
                // if (result.response) {
                //    await AriaService.storeMessage(user.id, result.response, false);
                // }
            } else {
                const errorMsg: AriaMessage = {
                    content: "Sorry, I'm having trouble connecting to the network.",
                    isFromUser: false,
                    createdAt: new Date().toISOString()
                };
                setMessages(prev => [...prev, errorMsg]);
            }
        } catch (err) {
            console.error("Error in chat flow:", err);
        } finally {
            setIsTyping(false);
            isSending.current = false;
        }
    };

    if (loading) return null;

    return (
        <div className={styles.container}>
            <Menu />

            <div className={styles.chatWrapper}>
                <div className={styles.header}>
                    <div className={styles.avatar}>
                        <span className={styles.avatarIcon}>✨</span>
                    </div>
                    <h1>Aria</h1>
                </div>

                <div className={styles.messagesArea}>
                    {messages.map((msg, index) => (
                        <div
                            key={index}
                            className={`${styles.messageRow} ${msg.isFromUser ? styles.userRow : styles.ariaRow}`}
                        >
                            {!msg.isFromUser && (
                                <div className={styles.messageAvatar}>
                                    <span className={styles.avatarIconSmall}>✨</span>
                                </div>
                            )}
                            <div className={styles.messageContent}>
                                <div className={`${styles.bubble} ${msg.isFromUser ? styles.userBubble : styles.ariaBubble}`}>
                                    {msg.content}
                                </div>

                                {!msg.isFromUser && msg.candidates && msg.candidates.length > 0 && (
                                    <div className={styles.candidatesGrid}>
                                        {msg.candidates.map(candidate => (
                                            <CandidateCard
                                                key={candidate.id}
                                                candidate={candidate}
                                                connectionStatus={
                                                    candidate.isConnected ? 'connected' :
                                                        (pendingRequests.has(candidate.id) || candidate.isPending) ? 'pending' : 'none'
                                                }
                                                onInvite={handleInvite}
                                                onSkip={handleSkip}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {isTyping && (
                        <div className={`${styles.messageRow} ${styles.ariaRow}`}>
                            <div className={styles.messageAvatar}>
                                <span className={styles.avatarIconSmall}>✨</span>
                            </div>
                            <div className={`${styles.bubble} ${styles.ariaBubble} ${styles.typingBubble}`}>
                                <span className={styles.dot}></span>
                                <span className={styles.dot}></span>
                                <span className={styles.dot}></span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <form className={styles.inputArea} onSubmit={handleSend}>
                    <input
                        type="text"
                        className={styles.input}
                        placeholder="Message Aria..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                    />
                    <button type="submit" className={styles.sendButton} disabled={!input.trim() || isTyping}>
                        ➜
                    </button>
                </form>
            </div>
        </div>
    );
}
