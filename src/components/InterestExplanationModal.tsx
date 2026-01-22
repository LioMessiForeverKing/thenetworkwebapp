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
function parseExplanation(text: string): { bullets: string[]; isLegacy: boolean } {
    if (!text) return { bullets: [], isLegacy: false };
    
    // Check if it's the new bullet point format
    const bulletLines = text.split('\n').filter(line => line.trim().startsWith('•'));
    
    if (bulletLines.length > 0) {
        return { bullets: bulletLines.map(b => b.trim()), isLegacy: false };
    }
    
    // Legacy format - just return as single item
    return { bullets: [text], isLegacy: true };
}

// Render a single bullet point with bold text and arrow styling
function renderBullet(bullet: string, index: number) {
    // Remove the bullet point character
    let content = bullet.replace(/^•\s*/, '');
    
    // Parse **bold** text and → arrows
    const parts: React.ReactNode[] = [];
    let remaining = content;
    let keyIndex = 0;
    
    while (remaining.length > 0) {
        // Find **bold** patterns
        const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);
        
        if (boldMatch && boldMatch.index !== undefined) {
            // Add text before bold
            if (boldMatch.index > 0) {
                const beforeText = remaining.substring(0, boldMatch.index);
                // Check for arrows in the before text
                parts.push(...renderArrows(beforeText, keyIndex));
                keyIndex += 10;
            }
            // Add bold text
            parts.push(
                <span key={`bold-${index}-${keyIndex}`} className={styles.evidence}>
                    {boldMatch[1]}
                </span>
            );
            keyIndex++;
            remaining = remaining.substring(boldMatch.index + boldMatch[0].length);
        } else {
            // No more bold, add rest with arrow handling
            parts.push(...renderArrows(remaining, keyIndex));
            break;
        }
    }
    
    return (
        <li key={index} className={styles.bulletItem}>
            {parts}
        </li>
    );
}

// Helper to render arrows with special styling
function renderArrows(text: string, baseKey: number): React.ReactNode[] {
    const parts: React.ReactNode[] = [];
    const segments = text.split('→');
    
    segments.forEach((segment, i) => {
        if (i > 0) {
            parts.push(
                <span key={`arrow-${baseKey}-${i}`} className={styles.arrow}>→</span>
            );
        }
        if (segment) {
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
    const { bullets, isLegacy } = parseExplanation(explanation || '');
    
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
                    ) : isLegacy ? (
                        <p className={styles.explanation}>{explanation}</p>
                    ) : (
                        <ul className={styles.bulletList}>
                            {bullets.map((bullet, i) => renderBullet(bullet, i))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
