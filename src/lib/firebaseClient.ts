// Lightweight Firebase client setup (only Auth for step 1)
// Replace the placeholder env-based config with your real Firebase project config.
// We avoid initializing multiple times during hot reload by caching in global.

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
// Analytics is optional; import types lazily to avoid bundle overhead if unused
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp;

export function getFirebaseApp() {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else if (!app) {
    app = getApps()[0]!;
  }
  return app;
}

export const auth = () => getAuth(getFirebaseApp());

let _analytics: Analytics | null | undefined;

export async function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (typeof window === 'undefined') return null; // SSR guard
  if (_analytics !== undefined) return _analytics; // may be null if unsupported
  try {
    const supported = await isSupported();
    if (!supported) {
      _analytics = null;
    } else {
      _analytics = getAnalytics(getFirebaseApp());
    }
  } catch (err) {
    console.warn('Analytics init failed', err);
    _analytics = null;
  }
  return _analytics;
}


