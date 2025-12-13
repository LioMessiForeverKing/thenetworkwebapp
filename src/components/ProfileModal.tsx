'use client';

import { NetworkPerson } from '@/types/network';
import styles from './ProfileModal.module.css';

interface ProfileModalProps {
    person: NetworkPerson;
    onClose: () => void;
}

export default function ProfileModal({ person, onClose }: ProfileModalProps) {
    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                {/* Close button */}
                <button className={styles.closeButton} onClick={onClose}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                </button>

                {/* Avatar */}
                <div className={styles.avatarContainer}>
                    {person.imageUrl ? (
                        <img
                            src={person.imageUrl}
                            alt={person.name}
                            className={styles.avatar}
                        />
                    ) : (
                        <div className={styles.avatarPlaceholder}>
                            {person.name.charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>

                {/* Name */}
                <h2 className={styles.name}>{person.name}</h2>

                {/* Stars */}
                {person.stars > 0 && (
                    <div className={styles.stars}>
                        {Array.from({ length: person.stars }).map((_, i) => (
                            <span key={i} className={styles.star}>★</span>
                        ))}
                    </div>
                )}

                {/* Bio */}
                {person.bio && (
                    <p className={styles.bio}>{person.bio}</p>
                )}

                {/* Connection info */}
                <div className={styles.connectionInfo}>
                    <span className={styles.connectionCount}>
                        {person.connections.length} connections
                    </span>
                </div>

                {/* Actions */}
                <div className={styles.actions}>
                    <button className={styles.messageButton}>
                        Message
                    </button>
                </div>
            </div>
        </div>
    );
}
