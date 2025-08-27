import React from 'react';
import { cookies } from 'next/headers';
import { getMeta } from '@/i18n/meta';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://janet-tracker.me';

export default async function Head() {
    let locale: 'en' | 'it' = 'en';
    try {
        const store = await cookies();
        const c = store.get('janet_locale');
        if (c && (c.value === 'en' || c.value === 'it')) locale = c.value;
    } catch { /* ignore */ }
    const m = getMeta(locale, 'calendar');
    const url = `${siteUrl}/calendar`;
    return (
        <>
            <title>{m.title}</title>
            <meta name="description" content={m.description} />
            <link rel="canonical" href={url} />
            <meta property="og:title" content={m.title} />
            <meta property="og:description" content={m.description} />
            <meta property="og:url" content={url} />
            <meta name="twitter:title" content={m.title} />
            <meta name="twitter:description" content={m.description} />
        </>
    );
}
