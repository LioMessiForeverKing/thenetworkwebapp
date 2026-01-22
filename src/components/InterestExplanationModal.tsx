'use client';

import React from 'react';
import styles from './InterestExplanationModal.module.css';

interface InterestExplanationModalProps {
    interest: string;
    explanation: string | null;
    isLoading: boolean;
    error: string | null;
    onClose: () => void;
}

// Parse the explanation text into structured bullet points
function parseExplanation(text: string): string[] {
    if (!text) return [];
    
    // Split by bullet character •
    // This handles both "• item1 • item2" and "• item1\n• item2" formats
    const parts = text.split(/\s*•\s*/).filter(p => p.trim().length > 0);
    
    if (parts.length > 0) {
        return parts;
    }
    
    // If no bullets found, return as single item
    return [text];
}

// Render formatted text with **bold** and → arrows
function renderFormattedText(text: string): React.ReactNode[] {
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let keyIndex = 0;
    
    while (remaining.length > 0) {
        // Find **[text]** or **text** patterns
        const boldMatch = remaining.match(/\*\*\[([^\]]+)\]\*\*|\*\*([^*]+)\*\*/);
        
        if (boldMatch && boldMatch.index !== undefined) {
            // Add text before bold (with arrow styling)
            if (boldMatch.index > 0) {
                const beforeText = remaining.substring(0, boldMatch.index);
                parts.push(...renderWithArrows(beforeText, keyIndex));
                keyIndex += 100;
            }
            
            // Get the bold text (from either capture group)
            const boldText = boldMatch[1] || boldMatch[2];
            parts.push(
                <span key={`bold-${keyIndex}`} className={styles.evidence}>
                    {boldText}
                </span>
            );
            keyIndex++;
            remaining = remaining.substring(boldMatch.index + boldMatch[0].length);
        } else {
            // No more bold patterns, render rest with arrows
            parts.push(...renderWithArrows(remaining, keyIndex));
            break;
        }
    }
    
    return parts;
}

// Helper to render text with arrow styling
function renderWithArrows(text: string, baseKey: number): React.ReactNode[] {
    const parts: React.ReactNode[] = [];
    const segments = text.split('→');
    
    segments.forEach((segment, i) => {
        if (i > 0) {
            parts.push(
                <span key={`arrow-${baseKey}-${i}`} className={styles.arrow}> → </span>
            );
        }
        if (segment.trim()) {
            parts.push(<span key={`text-${baseKey}-${i}`}>{segment}</span>);
        }
    });
    
    return parts;
}

export default function InterestExplanationModal({
    interest,
    explanation,
    isLoading,
    error,
    onClose
}: InterestExplanationModalProps) {
    const bullets = parseExplanation(explanation || '');
    
    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <button className={styles.closeButton} onClick={onClose}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>

                <div className={styles.header}>
                    <h2 className={styles.title}>{interest}</h2>
                </div>

                <div className={styles.content}>
                    {isLoading ? (
                        <div className={styles.loadingContainer}>
                            <div className={styles.spinner}></div>
                            <p>Decoding your interest DNA...</p>
                        </div>
                    ) : error ? (
                        <div className={styles.error}>
                            <p>{error}</p>
                        </div>
                    ) : (
                        <ul className={styles.bulletList}>
                            {bullets.map((bullet, i) => (
                                <li key={i} className={styles.bulletItem}>
                                    {renderFormattedText(bullet)}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
