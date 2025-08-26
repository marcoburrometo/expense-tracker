// Lightweight Firebase client setup (only Auth for step 1)
// Replace the placeholder env-based config with your real Firebase project config.
// We avoid initializing multiple times during hot reload by caching in global.

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

/**
 * Next.js sostituisce a build-time gli accessi statici "process.env.NEXT_PUBLIC_*" con i valori letterali
 * nel bundle client. L'accesso dinamico tramite bracket (es: process.env[name]) in client-side restituisce
 * undefined perché l'oggetto process.env nel browser è vuoto. Per questo definiamo una mappa statica.
 */
const publicEnv = {
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
} as const;

function requirePublic<K extends keyof typeof publicEnv>(key: K): string {
  const v = publicEnv[key];
  if (!v) throw new Error(`Missing Firebase env var: ${key}`);
  return v;
}

// Config Firebase usando solo accessi statici (compatibile con client bundle)
const firebaseConfig = {
  apiKey: requirePublic('NEXT_PUBLIC_FIREBASE_API_KEY'),
  authDomain: requirePublic('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  projectId: requirePublic('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
  appId: requirePublic('NEXT_PUBLIC_FIREBASE_APP_ID'),
  storageBucket: publicEnv.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: publicEnv.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  measurementId: publicEnv.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
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
