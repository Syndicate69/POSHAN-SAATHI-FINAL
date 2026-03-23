import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const isFirebaseConfigured = !!firebaseConfig.apiKey;

let app: any = null;
let auth: any = null;
let db: any = null;
let analytics: any = null;

if (isFirebaseConfigured) {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    
    // Enable offline persistence using the new API
    if (typeof window !== "undefined") {
      try {
        db = initializeFirestore(app, {
          localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
        });
      } catch (err: any) {
        console.warn('Firestore persistence initialization failed:', err);
        db = getFirestore(app);
      }
    } else {
      db = getFirestore(app);
    }
  } else {
    app = getApp();
    auth = getAuth(app);
    db = getFirestore(app);
  }

  if (typeof window !== "undefined") {
    isSupported().then((yes) => yes ? analytics = getAnalytics(app) : null);
  }
}

export { app, auth, db, analytics, isFirebaseConfigured };