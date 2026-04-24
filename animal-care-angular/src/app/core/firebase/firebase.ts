import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { Firestore, getFirestore } from 'firebase/firestore';
import { environment } from '../../../environments/environment';

let appInstance: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

export function getFirebaseApp(): FirebaseApp | null {
  if (!isBrowser()) return null;
  if (appInstance) return appInstance;
  appInstance = getApps().length ? getApps()[0] : initializeApp(environment.firebase);
  return appInstance;
}

export function getDb(): Firestore | null {
  if (!isBrowser()) return null;
  if (dbInstance) return dbInstance;
  const app = getFirebaseApp();
  if (!app) return null;
  dbInstance = getFirestore(app);
  return dbInstance;
}

export function isFirestoreAvailable(): boolean {
  return getDb() !== null;
}
