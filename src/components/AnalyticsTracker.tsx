"use client";
import { usePathname, useSearchParams } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';
import { getFirebaseAnalytics } from '@/lib/firebaseClient';
import { logEvent, type Analytics } from 'firebase/analytics';

const OPT_OUT_KEY = 'janet.analytics.disabled';

function isOptedOut(): boolean {
    if (typeof window === 'undefined') return true;
    try { return localStorage.getItem(OPT_OUT_KEY) === '1'; } catch { return true; }
}

interface AnalyticsTrackerProps { measurementId?: string }

export const AnalyticsTracker: React.FC<AnalyticsTrackerProps> = ({ measurementId }) => {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const prevPath = useRef<string | null>(null);
    const [analytics, setAnalytics] = useState<Analytics | null>(null);
    const optedOut = isOptedOut();

    // Lazy init Firebase Analytics (respects opt-out and presence of measurement id)
    useEffect(() => {
        if (!measurementId) return;
        if (optedOut) return;
        let cancelled = false;
        (async () => {
            const a = await getFirebaseAnalytics();
            if (!cancelled) setAnalytics(a);
        })();
        return () => { cancelled = true; };
    }, [measurementId, optedOut]);

    // Track page views
    useEffect(() => {
        if (!analytics) return;
        if (optedOut) return;
        const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
        if (prevPath.current === url) return;
        prevPath.current = url;
        try {
            logEvent(analytics, 'page_view', {
                page_path: pathname,
                page_location: typeof window !== 'undefined' ? window.location.href : undefined,
                page_title: document?.title,
            });
        } catch (err) {
            console.warn('page_view log failed', err);
        }
    }, [analytics, pathname, searchParams, optedOut]);

    return null;
};

export default AnalyticsTracker;
