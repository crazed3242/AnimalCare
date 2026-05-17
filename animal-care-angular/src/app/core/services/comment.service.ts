import { Injectable, signal } from '@angular/core';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc
} from 'firebase/firestore';
import { Comment } from '../models/comment.model';
import { AuthService } from './auth.service';
import { getDb } from '../firebase/firebase';

const COMMENTS_COLLECTION = 'comments';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

@Injectable({ providedIn: 'root' })
export class CommentService {
  private commentsSignal = signal<Comment[]>([]);
  readonly comments = this.commentsSignal.asReadonly();

  constructor(private authService: AuthService) {
    this.subscribeToComments();
  }

  private subscribeToComments(): void {
    const db = getDb();
    if (!db) return;

    onSnapshot(collection(db, COMMENTS_COLLECTION), snapshot => {
      const comments = snapshot.docs.map(d => d.data() as Comment);
      this.commentsSignal.set(comments);
    });
  }

  getCommentsByPost(postId: string): Comment[] {
    return this.commentsSignal()
      .filter(c => c.postId === postId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  addComment(postId: string, content: string): { success: boolean; error?: string; comment?: Comment } {
    const user = this.authService.currentUser();
    if (!user) return { success: false, error: 'Not logged in' };
    if (!content.trim()) return { success: false, error: 'Comment cannot be empty' };

    const db = getDb();
    if (!db) return { success: false, error: 'Offline' };

    const comment: Comment = {
      id: generateId(),
      postId,
      userId: user.id,
      userName: user.name,
      userAvatarUrl: user.avatarUrl,
      content: content.trim(),
      createdAt: new Date().toISOString()
    };

    this.commentsSignal.update(list => [...list, comment]);

    setDoc(doc(db, COMMENTS_COLLECTION, comment.id), comment).catch(err => {
      console.error('[CommentService] addComment failed', err);
      this.commentsSignal.update(list => list.filter(c => c.id !== comment.id));
    });

    return { success: true, comment };
  }

  deleteComment(commentId: string): { success: boolean; error?: string } {
    const user = this.authService.currentUser();
    if (!user) return { success: false, error: 'Not logged in' };

    const comment = this.commentsSignal().find(c => c.id === commentId);
    if (!comment) return { success: false, error: 'Comment not found' };

    if (comment.userId !== user.id && user.role !== 'admin') {
      return { success: false, error: 'Not authorized' };
    }

    const db = getDb();
    if (!db) return { success: false, error: 'Offline' };

    this.commentsSignal.update(list => list.filter(c => c.id !== commentId));

    deleteDoc(doc(db, COMMENTS_COLLECTION, commentId)).catch(err => {
      console.error('[CommentService] deleteComment failed', err);
      this.commentsSignal.update(list => [...list, comment]);
    });

    return { success: true };
  }

  getCommentCount(postId: string): number {
    return this.commentsSignal().filter(c => c.postId === postId).length;
  }
}
