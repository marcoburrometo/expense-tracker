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

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'JANET – Just ANother Expense Tracker',
  description: 'JANET (Just ANother Expense Tracker): glass UI budgeting, calendar insights, multi‑workspace Firebase sync.',
  openGraph: {
    title: 'JANET – Just ANother Expense Tracker',
    description: 'Track expenses & budgets with a refined glass interface, calendar heat, and multi‑workspace sync.',
    siteName: 'JANET',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'JANET – Just ANother Expense Tracker',
    description: 'Glass UI expense & budget tracker with calendar insights and Firebase sync.',
  },
  applicationName: 'JANET',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gaId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen text-neutral-900 dark:text-neutral-50`}>
        <div className="app-shell">
          <ThemeProvider>
            <I18nProvider>
              <ToastProvider>
                <AuthProvider>
                  <TrackerProvider>
                    <WorkspaceProvider>
                      <MovementFiltersProvider>
                        <div className="sticky top-0 z-20 px-4 pt-4">
                          <Navbar />
                        </div>
                        <div className="app-main">
                          {children}
                        </div>
                        <AnalyticsTracker measurementId={gaId} />
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
