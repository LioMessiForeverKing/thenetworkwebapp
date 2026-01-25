'use client';

import React, { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

/**
 * Redirect old per-user interest space URLs to the global space.
 * /network-profile/[slug]/interest/[interest] -> /feed/[interest]
 */
export default function InterestFeedRedirect() {
    const router = useRouter();
    const params = useParams();
    const interestParam = (params?.interest as string) || '';

    useEffect(() => {
        if (interestParam) {
            router.replace(`/feed/${encodeURIComponent(interestParam)}`);
        }
    }, [interestParam, router]);

    return null;
}
