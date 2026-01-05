'use client';

import React from 'react';
import styles from './AriaMessage.module.css';

export default function AriaMessage() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <p className={styles.message}>
          You're surrounded by ambitious people who want to build, and who are looking for others like them.
        </p>
        <p className={styles.message}>
          The people you meet through Ari might become your co-founder, your next collaborator, your podcast partner, 
          your gaming duo, a best friend, or a romantic partner who changes the trajectory of your heart.
        </p>
        <p className={styles.message}>
          Meeting the right person shouldn't feel like luck. It should feel <span className={styles.highlight}>inevitable</span>.
        </p>
        <p className={styles.message}>
          We've watched social apps and "networking" startups try to make that real, and mostly miss. 
          We're here to do it properly.
        </p>
        <p className={styles.message}>
          Right now, the web app is our small demo of what we're building. We hope you invite a few friends to join you here, 
          start building your network, and uncover what you and your closest people share as common interests.
        </p>
        <p className={styles.message}>
          A lot of updates are coming soon, and the mobile app is on the way. If you want to collaborate while we build, 
          message us however you want, tell us what you'd want this to become, what would make it genuinely useful, 
          and what would make you come back.
        </p>
        <p className={styles.message}>
          And truly: thank you for joining us on this journey. Every single person who signs up means the world to us. 
          We want to build this for you, and you're the reason we can turn it into something real.
        </p>
        <div className={styles.signature}>— TheNetwork Team</div>
      </div>
    </div>
  );
}

