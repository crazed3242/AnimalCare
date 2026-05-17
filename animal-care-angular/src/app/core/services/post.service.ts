import { Injectable, signal } from '@angular/core';
import {
  collection,
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
const RESERVATIONS_COLLECTION = 'reservations';
const TRANSACTIONS_COLLECTION = 'transactions';

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

    if (request.type === 'event') {
      if (!request.eventName?.trim()) return { success: false, error: 'Event name is required' };
      if (!request.eventCategory) return { success: false, error: 'Event category is required' };
      if (request.eventEndDate && request.eventEndDate < request.date) {
        return { success: false, error: 'End date cannot be before the start date' };
      }
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
      imageUrls: request.imageUrls?.length ? request.imageUrls : undefined,
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
      reservationStatus: request.type === 'adoption' ? 'available' : undefined,
      eventName: request.eventName?.trim(),
      eventCategory: request.eventCategory,
      eventEndDate: request.eventEndDate,
      organizerName: request.organizerName?.trim() || (request.type === 'event' ? user.name : undefined),
      expectedAttendees: request.expectedAttendees?.trim(),
      eventStatus: request.type === 'event' ? 'proposed' : undefined,
      createdAt: now,
      updatedAt: now,
      version: 0
    };

    void (async () => {
      const batch = writeBatch(db);
      batch.set(doc(db, POSTS_COLLECTION, post.id), sanitize(post));
      const logId = generateId();
      batch.set(doc(db, TRANSACTIONS_COLLECTION, logId), sanitize({
        id: logId,
        type: 'POST_CREATE',
        outcome: 'COMMITTED',
        actorId: user.id,
        actorName: user.name,
        message: `Created ${post.type} post ${post.id}`,
        entities: [{ collection: POSTS_COLLECTION, docId: post.id }],
        createdAt: now
      }));
      try {
        await batch.commit();
      } catch (err) {
        console.error('[PostService] createPost failed', err);
      }
    })();

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

    const patch = {
      ...updates,
      updatedAt: new Date().toISOString(),
      version: (post.version ?? 0) + 1
    };
    updateDoc(doc(db, POSTS_COLLECTION, postId), sanitize(patch)).catch(err => {
      console.error('[PostService] updatePost failed', err);
    });

    return { success: true };
  }

  /**
   * Atomic post deletion.
   *
   * The post, its comments, and any related reservations all live in
   * separate top-level collections in Firestore. To guarantee no orphans,
   * we read the related docs and queue every delete into a single
   * writeBatch. writeBatch is atomic - all deletes commit or none do.
   * We piggyback the audit log row inside the same batch so the audit
   * trail is also rolled back on failure.
   */
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
        const [commentDocs, reservationDocs] = await Promise.all([
          getDocs(query(collection(db, COMMENTS_COLLECTION), where('postId', '==', postId))),
          getDocs(query(collection(db, RESERVATIONS_COLLECTION), where('postId', '==', postId)))
        ]);

        const batch = writeBatch(db);
        batch.delete(doc(db, POSTS_COLLECTION, postId));
        commentDocs.forEach(d => batch.delete(d.ref));
        reservationDocs.forEach(d => batch.delete(d.ref));

        const logId = generateId();
        batch.set(doc(db, TRANSACTIONS_COLLECTION, logId), sanitize({
          id: logId,
          type: 'POST_DELETE',
          outcome: 'COMMITTED',
          actorId: user.id,
          actorName: user.name,
          message: `Deleted post ${postId} and ${commentDocs.size} comment(s) + ${reservationDocs.size} reservation(s)`,
          entities: [
            { collection: POSTS_COLLECTION, docId: postId },
            ...commentDocs.docs.map(d => ({ collection: COMMENTS_COLLECTION, docId: d.id })),
            ...reservationDocs.docs.map(d => ({ collection: RESERVATIONS_COLLECTION, docId: d.id }))
          ],
          createdAt: new Date().toISOString()
        }));

        await batch.commit();
      } catch (err) {
        console.error('[PostService] deletePost failed', err);
        try {
          const logId = generateId();
          await setDoc(doc(db, TRANSACTIONS_COLLECTION, logId), sanitize({
            id: logId,
            type: 'POST_DELETE',
            outcome: 'ROLLED_BACK',
            actorId: user.id,
            actorName: user.name,
            message: `Delete failed for post ${postId}`,
            entities: [{ collection: POSTS_COLLECTION, docId: postId }],
            errorReason: err instanceof Error ? err.message : 'unknown',
            createdAt: new Date().toISOString()
          }));
        } catch {
          /* swallow */
        }
      }
    })();

    return { success: true };
  }

  resolvePost(postId: string): { success: boolean; error?: string } {
    const result = this.updatePost(postId, { resolved: true });
    if (result.success) this.logResolution(postId, true);
    return result;
  }

  unresolvePost(postId: string): { success: boolean; error?: string } {
    const result = this.updatePost(postId, { resolved: false });
    if (result.success) this.logResolution(postId, false);
    return result;
  }

  private logResolution(postId: string, resolved: boolean): void {
    const db = getDb();
    const user = this.authService.currentUser();
    if (!db || !user) return;
    const logId = generateId();
    setDoc(doc(db, TRANSACTIONS_COLLECTION, logId), sanitize({
      id: logId,
      type: 'POST_RESOLVE',
      outcome: 'COMMITTED',
      actorId: user.id,
      actorName: user.name,
      message: `${resolved ? 'Resolved' : 'Reopened'} post ${postId}`,
      entities: [{ collection: POSTS_COLLECTION, docId: postId }],
      createdAt: new Date().toISOString()
    })).catch(err => console.error('[PostService] log resolve failed', err));
  }

  /**
   * Admin-only event moderation. Updates eventStatus and stamps who/when
   * decided so the audit log reflects which admin approved or rejected
   * each proposed event.
   */
  decideEvent(postId: string, decision: 'approved' | 'rejected'): { success: boolean; error?: string } {
    const user = this.authService.currentUser();
    if (!user) return { success: false, error: 'Not logged in' };
    if (user.role !== 'admin') return { success: false, error: 'Admins only' };

    const post = this.postsSignal().find(p => p.id === postId);
    if (!post) return { success: false, error: 'Post not found' };
    if (post.type !== 'event') return { success: false, error: 'Not an event post' };

    const now = new Date().toISOString();
    const result = this.updatePost(postId, {
      eventStatus: decision,
      eventDecidedBy: user.name,
      eventDecidedAt: now
    });

    if (result.success) {
      const db = getDb();
      if (db) {
        const logId = generateId();
        setDoc(doc(db, TRANSACTIONS_COLLECTION, logId), sanitize({
          id: logId,
          type: decision === 'approved' ? 'EVENT_APPROVE' : 'EVENT_REJECT',
          outcome: 'COMMITTED',
          actorId: user.id,
          actorName: user.name,
          message: `${decision === 'approved' ? 'Approved' : 'Rejected'} event "${post.eventName ?? post.id}"`,
          entities: [{ collection: POSTS_COLLECTION, docId: postId }],
          createdAt: now
        })).catch(err => console.error('[PostService] log event decision failed', err));
      }
    }
    return result;
  }
}

function sanitize<T extends Record<string, any>>(obj: T): T {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as T;
}
