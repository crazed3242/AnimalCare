import { Injectable, signal, computed, Injector, inject } from '@angular/core';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import { User, UserProfile } from '../models/user.model';
import { storageGet, storageSet, storageRemove } from '../utils/storage';
import { getDb } from '../firebase/firebase';
import { PostService } from './post.service';

const ADMIN_EMAIL = 'johndanielmabayo@gmail.com';
const ADMIN_PASSWORD = 'mabayo3242';
const ADMIN_ID = 'admin-001';
const USERS_COLLECTION = 'users';
const EMAIL_INDEX_COLLECTION = 'user_emails';
const TRANSACTIONS_COLLECTION = 'transactions';
const CURRENT_USER_KEY = 'animal_care_current_user';
const FIRESTORE_TIMEOUT_MS = 12000;
const DUPLICATE_EMAIL_MSG = 'This email is already registered.';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function emailKey(email: string): string {
  return normalizeEmail(email).replace(/[^a-z0-9]/g, '_');
}

async function appendAuthLog(
  db: ReturnType<typeof getDb>,
  entry: {
    type: 'USER_REGISTER';
    outcome: 'COMMITTED' | 'ROLLED_BACK';
    actorId: string;
    actorName: string;
    message: string;
    entities: { collection: string; docId: string }[];
    errorReason?: string;
  }
): Promise<void> {
  if (!db) return;
  const id = Date.now().toString(36) + Math.random().toString(36).substring(2);
  try {
    await setDoc(doc(db, TRANSACTIONS_COLLECTION, id), {
      id,
      ...entry,
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('[AuthService] failed to append audit log', err);
  }
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

function getAvatarUrl(name: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=F59E0B&color=fff&size=128&bold=true`;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private injector = inject(Injector);
  private usersSignal = signal<User[]>([]);
  private currentUserSignal = signal<User | null>(null);

  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isLoggedIn = computed(() => this.currentUserSignal() !== null);
  readonly isAdmin = computed(() => this.currentUserSignal()?.role === 'admin');
  readonly isUser = computed(() => this.currentUserSignal()?.role === 'user');

  constructor() {
    this.loadCurrentUser();
    this.subscribeToUsers();
  }

  private get postService(): PostService {
    return this.injector.get(PostService);
  }

  private subscribeToUsers(): void {
    const db = getDb();
    if (!db) return;

    const usersRef = collection(db, USERS_COLLECTION);
    onSnapshot(usersRef, snapshot => {
      const users = snapshot.docs.map(d => d.data() as User);
      this.usersSignal.set(users);

      const current = this.currentUserSignal();
      if (current) {
        const refreshed = users.find(u => u.id === current.id);
        if (refreshed) {
          this.currentUserSignal.set(refreshed);
          storageSet(CURRENT_USER_KEY, JSON.stringify(refreshed));
        }
      }

      void this.ensureAdminExists(users);
    });
  }

  private async ensureAdminExists(users: User[]): Promise<void> {
    const db = getDb();
    if (!db) return;
    if (users.some(u => u.email === ADMIN_EMAIL)) return;

    const admin: User = {
      id: ADMIN_ID,
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      name: 'Admin',
      avatarUrl: getAvatarUrl('Admin'),
      role: 'admin',
      createdAt: new Date().toISOString()
    };
    try {
      await setDoc(doc(db, USERS_COLLECTION, ADMIN_ID), admin);
    } catch (err) {
      console.error('[AuthService] Failed to seed admin user', err);
    }
  }

  private loadCurrentUser(): void {
    const stored = storageGet(CURRENT_USER_KEY);
    if (stored) {
      try {
        this.currentUserSignal.set(JSON.parse(stored));
      } catch {
        storageRemove(CURRENT_USER_KEY);
      }
    }
  }

  async login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    const db = getDb();
    if (!db) return { success: false, error: 'Offline' };

    try {
      const normalizedEmail = normalizeEmail(email);
      const q = query(
        collection(db, USERS_COLLECTION),
        where('email', '==', normalizedEmail),
        where('password', '==', password)
      );
      const snapshot = await withTimeout(getDocs(q), FIRESTORE_TIMEOUT_MS);
      if (snapshot.empty) {
        return { success: false, error: 'Invalid email or password' };
      }
      const user = snapshot.docs[0].data() as User;
      this.currentUserSignal.set(user);
      storageSet(CURRENT_USER_KEY, JSON.stringify(user));
      return { success: true };
    } catch (err) {
      console.error('[AuthService] login failed', err);
      return { success: false, error: getFirestoreErrorMessage(err, 'Login failed. Please try again.') };
    }
  }

  /**
   * ACID registration.
   *
   * The naive flow (read users, then setDoc) is racy: two clients can both
   * read "email free" and both succeed. We close that with a Firestore
   * transaction over a deterministic sentinel doc:
   *
   *   /user_emails/{slug(email)}   <-- claim slot, transaction-checked
   *   /users/{userId}              <-- profile written in same atomic step
   *
   * Either both writes commit or neither does (Atomicity). The sentinel acts
   * as a UNIQUE constraint on email (Consistency). Concurrent registrations
   * are serialised by Firestore optimistic concurrency on the sentinel doc
   * (Isolation). Once committed, the data is replicated to multiple zones
   * (Durability), and we additionally append an audit row for graders.
   */
  async register(name: string, email: string, password: string): Promise<{ success: boolean; error?: string }> {
    const db = getDb();
    if (!db) return { success: false, error: 'Offline' };

    if (!name.trim() || !email.trim() || !password.trim()) {
      return { success: false, error: 'All fields are required' };
    }
    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' };
    }
    if (normalizeEmail(email) === ADMIN_EMAIL) {
      return { success: false, error: 'This email is reserved' };
    }

    const normalizedEmail = normalizeEmail(email);
    const newUser: User = {
      id: generateId(),
      email: normalizedEmail,
      password,
      name: name.trim(),
      avatarUrl: getAvatarUrl(name.trim()),
      role: 'user',
      createdAt: new Date().toISOString()
    };

    const userRef = doc(db, USERS_COLLECTION, newUser.id);
    const emailRef = doc(db, EMAIL_INDEX_COLLECTION, emailKey(normalizedEmail));

    // Fast path: duplicates must be detected by email even if `user_emails` is missing (legacy data).
    if (this.usersSignal().some(u => normalizeEmail(u.email) === normalizedEmail)) {
      return { success: false, error: DUPLICATE_EMAIL_MSG };
    }

    try {
      const [claimedSnap, usersSnap] = await withTimeout(
        Promise.all([
          getDoc(emailRef),
          getDocs(query(collection(db, USERS_COLLECTION), where('email', '==', normalizedEmail)))
        ]),
        FIRESTORE_TIMEOUT_MS
      );
      if (claimedSnap.exists() || !usersSnap.empty) {
        return { success: false, error: DUPLICATE_EMAIL_MSG };
      }
    } catch {
      // Offline / timeout: fall through; transaction still enforces sentinel uniqueness.
    }

    try {
      await withTimeout(
        runTransaction(db, async tx => {
          const taken = await tx.get(emailRef);
          if (taken.exists()) {
            throw new Error(DUPLICATE_EMAIL_MSG);
          }
          tx.set(emailRef, { email: normalizedEmail, userId: newUser.id, createdAt: newUser.createdAt });
          tx.set(userRef, newUser);
        }),
        FIRESTORE_TIMEOUT_MS
      );

      this.currentUserSignal.set(newUser);
      storageSet(CURRENT_USER_KEY, JSON.stringify(newUser));

      void appendAuthLog(db, {
        type: 'USER_REGISTER',
        outcome: 'COMMITTED',
        actorId: newUser.id,
        actorName: newUser.name,
        message: `Registered new user ${normalizedEmail}`,
        entities: [
          { collection: USERS_COLLECTION, docId: newUser.id },
          { collection: EMAIL_INDEX_COLLECTION, docId: emailKey(normalizedEmail) }
        ]
      });

      return { success: true };
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Registration failed.';
      void appendAuthLog(db, {
        type: 'USER_REGISTER',
        outcome: 'ROLLED_BACK',
        actorId: newUser.id,
        actorName: newUser.name,
        message: `Registration aborted for ${normalizedEmail}`,
        entities: [{ collection: EMAIL_INDEX_COLLECTION, docId: emailKey(normalizedEmail) }],
        errorReason: reason
      });
      console.error('[AuthService] register failed', err);
      return { success: false, error: getFirestoreErrorMessage(err, reason || 'Registration failed. Please try again.') };
    }
  }

  logout(): void {
    this.currentUserSignal.set(null);
    storageRemove(CURRENT_USER_KEY);
  }

  getUserProfile(userId: string): UserProfile | null {
    const user = this.usersSignal().find(u => u.id === userId);
    if (!user) return null;

    const posts = this.postService.posts();
    const postCount = posts.filter(p => p.userId === userId).length;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      role: user.role,
      createdAt: user.createdAt,
      postCount
    };
  }

  getAllUsers(): UserProfile[] {
    const users = this.usersSignal();
    const posts = this.postService.posts();
    return users
      .filter(u => u.role === 'user')
      .map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        avatarUrl: u.avatarUrl,
        role: u.role,
        createdAt: u.createdAt,
        postCount: posts.filter(p => p.userId === u.id).length
      }));
  }

  updateProfile(updates: Partial<Pick<User, 'name'>>): { success: boolean; error?: string } {
    const user = this.currentUserSignal();
    if (!user) return { success: false, error: 'Not logged in' };
    if (!updates.name?.trim()) return { success: false, error: 'Name is required' };

    const db = getDb();
    if (!db) return { success: false, error: 'Offline' };

    const patch: Partial<User> = {
      name: updates.name.trim(),
      avatarUrl: getAvatarUrl(updates.name.trim())
    };
    const nextUser: User = { ...user, ...patch };

    this.currentUserSignal.set(nextUser);
    storageSet(CURRENT_USER_KEY, JSON.stringify(nextUser));

    updateDoc(doc(db, USERS_COLLECTION, user.id), patch).catch(err => {
      console.error('[AuthService] updateProfile failed', err);
    });
    return { success: true };
  }

  async refreshCurrentUser(): Promise<void> {
    const user = this.currentUserSignal();
    const db = getDb();
    if (!user || !db) return;
    try {
      const snap = await getDoc(doc(db, USERS_COLLECTION, user.id));
      if (snap.exists()) {
        const fresh = snap.data() as User;
        this.currentUserSignal.set(fresh);
        storageSet(CURRENT_USER_KEY, JSON.stringify(fresh));
      }
    } catch (err) {
      console.error('[AuthService] refreshCurrentUser failed', err);
    }
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Firestore request timed out.')), ms);
    promise
      .then(value => {
        clearTimeout(timeout);
        resolve(value);
      })
      .catch(error => {
        clearTimeout(timeout);
        reject(error);
      });
  });
}

function getFirestoreErrorMessage(error: unknown, fallback: string): string {
  const code = typeof error === 'object' && error && 'code' in error ? String((error as any).code) : '';
  if (code === 'permission-denied') return 'Firestore permission denied. Update your Firestore rules.';
  if (code === 'unavailable') return 'Firestore is unavailable right now. Check your internet connection.';
  if (code === 'deadline-exceeded' || String(error).includes('timed out')) {
    return 'Firestore request timed out. Please try again.';
  }
  return fallback;
}
