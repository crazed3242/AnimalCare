import { Injectable, signal } from '@angular/core';
import { Comment } from '../models/comment.model';
import { AuthService } from './auth.service';
import { storageGet, storageSet } from '../utils/storage';

const COMMENTS_KEY = 'animal_care_comments';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

@Injectable({ providedIn: 'root' })
export class CommentService {
  private commentsSignal = signal<Comment[]>([]);
  readonly comments = this.commentsSignal.asReadonly();

  constructor(private authService: AuthService) {
    this.loadComments();
  }

  private loadComments(): void {
    const stored = storageGet(COMMENTS_KEY);
    if (stored) {
      try {
        this.commentsSignal.set(JSON.parse(stored));
      } catch {
        this.commentsSignal.set([]);
      }
    }
  }

  private saveComments(comments: Comment[]): void {
    storageSet(COMMENTS_KEY, JSON.stringify(comments));
    this.commentsSignal.set(comments);
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

    const comment: Comment = {
      id: generateId(),
      postId,
      userId: user.id,
      userName: user.name,
      userAvatarUrl: user.avatarUrl,
      content: content.trim(),
      createdAt: new Date().toISOString()
    };

    const comments = [...this.commentsSignal(), comment];
    this.saveComments(comments);
    return { success: true, comment };
  }

  deleteComment(commentId: string): { success: boolean; error?: string } {
    const user = this.authService.currentUser();
    if (!user) return { success: false, error: 'Not logged in' };

    const comments = this.commentsSignal();
    const comment = comments.find(c => c.id === commentId);
    if (!comment) return { success: false, error: 'Comment not found' };

    if (comment.userId !== user.id && user.role !== 'admin') {
      return { success: false, error: 'Not authorized' };
    }

    const updated = comments.filter(c => c.id !== commentId);
    this.saveComments(updated);
    return { success: true };
  }

  getCommentCount(postId: string): number {
    return this.commentsSignal().filter(c => c.postId === postId).length;
  }
}
