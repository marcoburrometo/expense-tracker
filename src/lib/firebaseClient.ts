// Lightweight Firebase client setup (only Auth for step 1)
// Replace the placeholder env-based config with your real Firebase project config.
// We avoid initializing multiple times during hot reload by caching in global.

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing Firebase env var: ${name}`);
  return v;
}

// Fail fast instead of using fake placeholders that cause Firestore 400 Listen errors.
const firebaseConfig = {
  apiKey: requireEnv('NEXT_PUBLIC_FIREBASE_API_KEY'),
  authDomain: requireEnv('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  projectId: requireEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
  appId: requireEnv('NEXT_PUBLIC_FIREBASE_APP_ID'),
  // Optional vars (do not force):
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
