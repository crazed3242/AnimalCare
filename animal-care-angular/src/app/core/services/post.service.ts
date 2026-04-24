import { Injectable, signal } from '@angular/core';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore';
import { Post, PostType, CreatePostRequest } from '../models/post.model';
import { AuthService } from './auth.service';
import { getDb } from '../firebase/firebase';

const POSTS_COLLECTION = 'posts';
const COMMENTS_COLLECTION = 'comments';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

@Injectable({ providedIn: 'root' })
export class PostService {
  private postsSignal = signal<Post[]>([]);
  readonly posts = this.postsSignal.asReadonly();

  constructor(private authService: AuthService) {
    this.subscribeToPosts();
  }

  private subscribeToPosts(): void {
    const db = getDb();
    if (!db) return;

    onSnapshot(collection(db, POSTS_COLLECTION), snapshot => {
      const posts = snapshot.docs.map(d => d.data() as Post);
      this.postsSignal.set(posts);
    });
  }

  getPostsByType(type: PostType): Post[] {
    return this.postsSignal().filter(p => p.type === type);
  }

  getPostById(id: string): Post | undefined {
    return this.postsSignal().find(p => p.id === id);
  }

  getPostsByUser(userId: string): Post[] {
    return this.postsSignal().filter(p => p.userId === userId);
  }

  createPost(request: CreatePostRequest): { success: boolean; error?: string; post?: Post } {
    const user = this.authService.currentUser();
    if (!user) return { success: false, error: 'Not logged in' };

    if (!request.description.trim()) return { success: false, error: 'Description is required' };
    if (!request.location.trim()) return { success: false, error: 'Location is required' };
    if (!request.date) return { success: false, error: 'Date is required' };
    if (!request.contactInfo.trim()) return { success: false, error: 'Contact info is required' };

    if (request.type === 'rescue' && !request.urgencyLevel) {
      return { success: false, error: 'Urgency level is required for rescue posts' };
    }

    if (request.type === 'adoption') {
      if (!request.breed?.trim()) return { success: false, error: 'Breed is required for adoption posts' };
      if (!request.age?.trim()) return { success: false, error: 'Age is required for adoption posts' };
    }

    const db = getDb();
    if (!db) return { success: false, error: 'Offline' };

    const now = new Date().toISOString();
    const post: Post = {
      id: generateId(),
      type: request.type,
      userId: user.id,
      userName: user.name,
      userAvatarUrl: user.avatarUrl,
      imageUrl: request.imageUrl,
      description: request.description.trim(),
      location: request.location.trim(),
      date: request.date,
      contactInfo: request.contactInfo.trim(),
      resolved: false,
      urgencyLevel: request.urgencyLevel,
      breed: request.breed,
      age: request.age,
      healthCondition: request.healthCondition,
      adoptionRequirements: request.adoptionRequirements,
      createdAt: now,
      updatedAt: now
    };

    setDoc(doc(db, POSTS_COLLECTION, post.id), sanitize(post)).catch(err => {
      console.error('[PostService] createPost failed', err);
    });

    return { success: true, post };
  }

  updatePost(postId: string, updates: Partial<Post>): { success: boolean; error?: string } {
    const user = this.authService.currentUser();
    if (!user) return { success: false, error: 'Not logged in' };

    const post = this.postsSignal().find(p => p.id === postId);
    if (!post) return { success: false, error: 'Post not found' };

    if (post.userId !== user.id && user.role !== 'admin') {
      return { success: false, error: 'Not authorized' };
    }

    const db = getDb();
    if (!db) return { success: false, error: 'Offline' };

    const patch = { ...updates, updatedAt: new Date().toISOString() };
    updateDoc(doc(db, POSTS_COLLECTION, postId), sanitize(patch)).catch(err => {
      console.error('[PostService] updatePost failed', err);
    });

    return { success: true };
  }

  deletePost(postId: string): { success: boolean; error?: string } {
    const user = this.authService.currentUser();
    if (!user) return { success: false, error: 'Not logged in' };

    const post = this.postsSignal().find(p => p.id === postId);
    if (!post) return { success: false, error: 'Post not found' };

    if (post.userId !== user.id && user.role !== 'admin') {
      return { success: false, error: 'Not authorized' };
    }

    const db = getDb();
    if (!db) return { success: false, error: 'Offline' };

    void (async () => {
      try {
        await deleteDoc(doc(db, POSTS_COLLECTION, postId));
        const commentsQ = query(collection(db, COMMENTS_COLLECTION), where('postId', '==', postId));
        const commentDocs = await getDocs(commentsQ);
        if (!commentDocs.empty) {
          const batch = writeBatch(db);
          commentDocs.forEach(d => batch.delete(d.ref));
          await batch.commit();
        }
      } catch (err) {
        console.error('[PostService] deletePost failed', err);
      }
    })();

    return { success: true };
  }

  resolvePost(postId: string): { success: boolean; error?: string } {
    return this.updatePost(postId, { resolved: true });
  }

  unresolvePost(postId: string): { success: boolean; error?: string } {
    return this.updatePost(postId, { resolved: false });
  }
}

function sanitize<T extends Record<string, any>>(obj: T): T {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as T;
}
