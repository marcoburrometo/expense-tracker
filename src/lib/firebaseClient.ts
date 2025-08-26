// Lightweight Firebase client setup (only Auth for step 1)
// Replace the placeholder env-based config with your real Firebase project config.
// We avoid initializing multiple times during hot reload by caching in global.

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

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

console.log('......', firebaseConfig);

export function getFirebaseApp() {
  if (!getApps().length) {
    if (process.env.NODE_ENV === 'development') {
      app = initializeApp(firebaseConfig);
    } else {
      // In production do not use the local firebaseConfig object.
      // Rely on runtime-provided configuration (e.g. hosting-injected config) or initialize elsewhere.
      app = initializeApp();
    }
  } else if (!app) {
    app = getApps()[0]!;
  }
  return app;
}

export const auth = () => getAuth(getFirebaseApp());
