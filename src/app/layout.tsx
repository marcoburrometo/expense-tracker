import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { MovementFiltersProvider } from '@/state/MovementFiltersContext';
import { TrackerProvider } from '@/state/TrackerContext';
import { AuthProvider } from '@/state/AuthContext';
import { WorkspaceProvider } from '@/state/WorkspaceContext';
import { Navbar } from '@/components/Navbar';
import { QuickAdd } from '@/components/QuickAdd';
import { ThemeProvider } from '@/state/ThemeContext';
import { I18nProvider } from '@/state/I18nContext';
import { ToastProvider } from '@/state/ToastContext';
import AnalyticsTracker from '@/components/AnalyticsTracker';
import React, { Suspense } from 'react';
import { cookies } from 'next/headers';
import InitialAppLoader from '@/components/InitialAppLoader';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://janet-tracker.me';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'JANET – Just ANother Expense Tracker',
  description: 'JANET (Just ANother Expense Tracker): glass UI budgeting, calendar insights, multi‑workspace Firebase sync.',
  openGraph: {
    title: 'JANET – Just ANother Expense Tracker',
    description: 'Track expenses & budgets with a refined glass interface, calendar heat, and multi‑workspace sync.',
    siteName: 'JANET',
    url: siteUrl,
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'JANET – Just ANother Expense Tracker',
    description: 'Glass UI expense & budget tracker with calendar insights and Firebase sync.',
  },
  applicationName: 'JANET',
  icons: {
    icon: '/favicon.ico'
  }
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gaId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  let initialLang: 'en' | 'it' = 'en';
  try {
    const store = await cookies();
    const c = store.get('janet_locale');
    if (c && (c.value === 'en' || c.value === 'it')) initialLang = c.value;
  } catch { /* ignore */ }
  return (
    <html lang={initialLang}>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen text-neutral-900 dark:text-neutral-50`}>
        <div className="app-shell">
          <ThemeProvider>
            <I18nProvider>
              <ToastProvider>
                <AuthProvider>
                  <TrackerProvider>
                    <WorkspaceProvider>
                      <MovementFiltersProvider>
                        <InitialAppLoader />
                        <div className="sticky top-0 z-20 px-4 pt-4">
                          <Navbar />
                        </div>
                        <div className="app-main">
                          {children}
                        </div>
                        {/* Global JSON-LD structured data */}
                        <script
                          type="application/ld+json"
                          dangerouslySetInnerHTML={{
                            __html: JSON.stringify({
                              '@context': 'https://schema.org',
                              '@type': 'SoftwareApplication',
                              name: 'JANET',
                              applicationCategory: 'FinanceApplication',
                              operatingSystem: 'Any',
                              description: 'Privacy-first expense & budget tracker with recurring automation and calendar insights.',
                              offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
                              url: siteUrl
                            })
                          }}
                        />
                        <Suspense fallback={null}>
                          <AnalyticsTracker measurementId={gaId} />
                        </Suspense>
                        <QuickAdd />
                      </MovementFiltersProvider>
                    </WorkspaceProvider>
                  </TrackerProvider>
                </AuthProvider>
              </ToastProvider>
            </I18nProvider>
          </ThemeProvider>
        </div>
      </body>
    </html>
  );
}
