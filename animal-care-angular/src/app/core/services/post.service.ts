import { Injectable, signal } from '@angular/core';
import { Post, PostType, CreatePostRequest, UrgencyLevel } from '../models/post.model';
import { AuthService } from './auth.service';
import { storageGet, storageSet } from '../utils/storage';

const POSTS_KEY = 'animal_care_posts';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

@Injectable({ providedIn: 'root' })
export class PostService {
  private postsSignal = signal<Post[]>([]);
  readonly posts = this.postsSignal.asReadonly();

  constructor(private authService: AuthService) {
    this.loadPosts();
  }

  private loadPosts(): void {
    const stored = storageGet(POSTS_KEY);
    if (stored) {
      try {
        this.postsSignal.set(JSON.parse(stored));
      } catch {
        this.postsSignal.set([]);
      }
    }
  }

  private savePosts(posts: Post[]): void {
    storageSet(POSTS_KEY, JSON.stringify(posts));
    this.postsSignal.set(posts);
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

    const posts = [...this.postsSignal(), post];
    this.savePosts(posts);
    return { success: true, post };
  }

  updatePost(postId: string, updates: Partial<Post>): { success: boolean; error?: string } {
    const user = this.authService.currentUser();
    if (!user) return { success: false, error: 'Not logged in' };

    const posts = [...this.postsSignal()];
    const idx = posts.findIndex(p => p.id === postId);
    if (idx === -1) return { success: false, error: 'Post not found' };

    if (posts[idx].userId !== user.id && user.role !== 'admin') {
      return { success: false, error: 'Not authorized' };
    }

    posts[idx] = { ...posts[idx], ...updates, updatedAt: new Date().toISOString() };
    this.savePosts(posts);
    return { success: true };
  }

  deletePost(postId: string): { success: boolean; error?: string } {
    const user = this.authService.currentUser();
    if (!user) return { success: false, error: 'Not logged in' };

    const posts = this.postsSignal();
    const post = posts.find(p => p.id === postId);
    if (!post) return { success: false, error: 'Post not found' };

    if (post.userId !== user.id && user.role !== 'admin') {
      return { success: false, error: 'Not authorized' };
    }

    const updated = posts.filter(p => p.id !== postId);
    this.savePosts(updated);

    const comments = JSON.parse(storageGet('animal_care_comments') || '[]');
    storageSet('animal_care_comments', JSON.stringify(comments.filter((c: any) => c.postId !== postId)));

    return { success: true };
  }

  resolvePost(postId: string): { success: boolean; error?: string } {
    return this.updatePost(postId, { resolved: true });
  }

  unresolvePost(postId: string): { success: boolean; error?: string } {
    return this.updatePost(postId, { resolved: false });
  }
}
