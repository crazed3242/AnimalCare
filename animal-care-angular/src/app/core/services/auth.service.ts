import { Injectable, signal, computed } from '@angular/core';
import { User, UserProfile } from '../models/user.model';
import { storageGet, storageSet, storageRemove } from '../utils/storage';

const ADMIN_EMAIL = 'johndanielmabayo@gmail.com';
const ADMIN_PASSWORD = 'mabayo3242';
const USERS_KEY = 'animal_care_users';
const CURRENT_USER_KEY = 'animal_care_current_user';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

function getAvatarUrl(name: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=F59E0B&color=fff&size=128&bold=true`;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUserSignal = signal<User | null>(null);
  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isLoggedIn = computed(() => this.currentUserSignal() !== null);
  readonly isAdmin = computed(() => this.currentUserSignal()?.role === 'admin');
  readonly isUser = computed(() => this.currentUserSignal()?.role === 'user');

  constructor() {
    this.loadCurrentUser();
    this.ensureAdminExists();
  }

  private ensureAdminExists(): void {
    const users = this.getUsers();
    const adminExists = users.some(u => u.email === ADMIN_EMAIL);
    if (!adminExists) {
      users.push({
        id: 'admin-001',
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        name: 'Admin',
        avatarUrl: getAvatarUrl('Admin'),
        role: 'admin',
        createdAt: new Date().toISOString()
      });
      storageSet(USERS_KEY, JSON.stringify(users));
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

  private getUsers(): User[] {
    const stored = storageGet(USERS_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  private saveUsers(users: User[]): void {
    storageSet(USERS_KEY, JSON.stringify(users));
  }

  login(email: string, password: string): { success: boolean; error?: string } {
    const users = this.getUsers();
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) {
      return { success: false, error: 'Invalid email or password' };
    }
    this.currentUserSignal.set(user);
    storageSet(CURRENT_USER_KEY, JSON.stringify(user));
    return { success: true };
  }

  register(name: string, email: string, password: string): { success: boolean; error?: string } {
    const users = this.getUsers();

    if (email === ADMIN_EMAIL) {
      return { success: false, error: 'This email is reserved' };
    }

    if (users.some(u => u.email === email)) {
      return { success: false, error: 'Email already registered' };
    }

    if (!name.trim() || !email.trim() || !password.trim()) {
      return { success: false, error: 'All fields are required' };
    }

    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' };
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

    users.push(newUser);
    this.saveUsers(users);
    this.currentUserSignal.set(newUser);
    storageSet(CURRENT_USER_KEY, JSON.stringify(newUser));
    return { success: true };
  }

  logout(): void {
    this.currentUserSignal.set(null);
    storageRemove(CURRENT_USER_KEY);
  }

  getUserProfile(userId: string): UserProfile | null {
    const users = this.getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return null;

    const posts = JSON.parse(storageGet('animal_care_posts') || '[]');
    const postCount = posts.filter((p: any) => p.userId === userId).length;

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
    const users = this.getUsers();
    const posts = JSON.parse(storageGet('animal_care_posts') || '[]');
    return users
      .filter(u => u.role === 'user')
      .map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        avatarUrl: u.avatarUrl,
        role: u.role,
        createdAt: u.createdAt,
        postCount: posts.filter((p: any) => p.userId === u.id).length
      }));
  }

  updateProfile(updates: Partial<Pick<User, 'name'>>): { success: boolean; error?: string } {
    const user = this.currentUserSignal();
    if (!user) return { success: false, error: 'Not logged in' };

    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx === -1) return { success: false, error: 'User not found' };

    if (updates.name) {
      users[idx].name = updates.name;
      users[idx].avatarUrl = getAvatarUrl(updates.name);
    }

    this.saveUsers(users);
    this.currentUserSignal.set(users[idx]);
    storageSet(CURRENT_USER_KEY, JSON.stringify(users[idx]));
    return { success: true };
  }
}
