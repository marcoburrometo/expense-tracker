import React from 'react';
import { cookies } from 'next/headers';
import { getMeta } from '@/i18n/meta';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://janet-tracker.me';
const ogImage = `${siteUrl}/og-base.png`;

export default async function Head() {
    let locale: 'en' | 'it' = 'en';
    try {
        const store = await cookies();
        const c = store.get('janet_locale');
        if (c && (c.value === 'en' || c.value === 'it')) locale = c.value;
    } catch { /* ignore */ }
    const meta = getMeta(locale, 'home');
    return (
        <>
            <title>{meta.title}</title>
            <meta name="description" content={meta.description} />
            <meta name="application-name" content="JANET" />
            <meta name="apple-mobile-web-app-title" content="JANET" />
            <meta name="theme-color" content="#0d0d0f" />
            <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
            <link rel="canonical" href={siteUrl} />
            <link rel="alternate" href={siteUrl} hrefLang="en" />
            <link rel="alternate" href={siteUrl} hrefLang="it" />
            <link rel="alternate" href={siteUrl} hrefLang="x-default" />
            <meta property="og:type" content="website" />
            <meta property="og:site_name" content="JANET" />
            <meta property="og:title" content={meta.title} />
            <meta property="og:description" content={meta.description} />
            <meta property="og:url" content={siteUrl} />
            <meta property="og:image" content={ogImage} />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={meta.title} />
            <meta name="twitter:description" content={meta.description} />
            <meta name="twitter:image" content={ogImage} />
            <meta name="robots" content="index,follow" />
            <meta name="generator" content="Next.js" />
            <meta name="author" content="JANET" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        </>
    );
}
