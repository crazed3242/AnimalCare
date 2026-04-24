import { Injectable, signal, computed, Injector, inject } from '@angular/core';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
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
const CURRENT_USER_KEY = 'animal_care_current_user';
const FIRESTORE_TIMEOUT_MS = 12000;

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
      const q = query(
        collection(db, USERS_COLLECTION),
        where('email', '==', email),
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

  async register(name: string, email: string, password: string): Promise<{ success: boolean; error?: string }> {
    const db = getDb();
    if (!db) return { success: false, error: 'Offline' };

    if (!name.trim() || !email.trim() || !password.trim()) {
      return { success: false, error: 'All fields are required' };
    }
    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' };
    }
    if (email === ADMIN_EMAIL) {
      return { success: false, error: 'This email is reserved' };
    }

    try {
      const existingQ = query(
        collection(db, USERS_COLLECTION),
        where('email', '==', email)
      );
      const existing = await withTimeout(getDocs(existingQ), FIRESTORE_TIMEOUT_MS);
      if (!existing.empty) {
        return { success: false, error: 'Email already registered' };
      }

      const newUser: User = {
        id: generateId(),
        email: email.trim().toLowerCase(),
        password,
        name: name.trim(),
        avatarUrl: getAvatarUrl(name.trim()),
        role: 'user',
        createdAt: new Date().toISOString()
      };

      await withTimeout(setDoc(doc(db, USERS_COLLECTION, newUser.id), newUser), FIRESTORE_TIMEOUT_MS);
      this.currentUserSignal.set(newUser);
      storageSet(CURRENT_USER_KEY, JSON.stringify(newUser));
      return { success: true };
    } catch (err) {
      console.error('[AuthService] register failed', err);
      return { success: false, error: getFirestoreErrorMessage(err, 'Registration failed. Please try again.') };
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
