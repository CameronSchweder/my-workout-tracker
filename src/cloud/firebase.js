import { initializeApp } from 'firebase/app';
import {
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut as fbSignOut,
} from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

const PROJECT = 'my-workout-tracker-19ce0';

// On the deployed site, auth runs through our own domain (Vercel proxies /__/auth to Firebase,
// see vercel.json). That keeps sign-in first-party, which Safari and iOS home-screen apps need.
const host = window.location.hostname;
const isLocal = host === 'localhost' || host === '127.0.0.1' || /^\d+\.\d+\.\d+\.\d+$/.test(host) || host.endsWith('.local');

// Firebase web config values are public identifiers, not secrets. Access is enforced by firestore.rules.
const app = initializeApp({
  apiKey: 'AIzaSyAzVxflxnDaMngvMFsSVpo2_lQYNtYWgZA',
  authDomain: isLocal ? `${PROJECT}.firebaseapp.com` : window.location.host,
  projectId: PROJECT,
  storageBucket: `${PROJECT}.firebasestorage.app`,
  messagingSenderId: '468991625762',
  appId: '1:468991625762:web:8cb598b49bd85e185b587b',
});

export const auth = getAuth(app);

// Offline-first: reads come from an on-device cache and writes queue up until there's signal.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  ignoreUndefinedProperties: true,
});

const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

export async function signIn() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  // Popups are unreliable inside an iOS home-screen app, so use a full-page redirect there.
  if (isStandalone()) return signInWithRedirect(auth, provider);
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') {
      return signInWithRedirect(auth, provider);
    }
    if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') return;
    throw e;
  }
}

export const signOut = () => fbSignOut(auth);
export const redirectResult = () => getRedirectResult(auth);
