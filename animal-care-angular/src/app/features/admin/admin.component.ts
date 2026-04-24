import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { PostService } from '../../core/services/post.service';
import { CommentService } from '../../core/services/comment.service';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
    <div class="admin-page">
      <div class="admin-sidebar">
        <div class="admin-brand">
          <span class="brand-icon">🐾</span>
          <span class="brand-text">AnimalCare</span>
        </div>
        <div class="admin-role-badge">Admin Dashboard</div>
        <nav class="admin-nav">
          <button class="admin-nav-btn" [class.active]="activeTab() === 'overview'" (click)="activeTab.set('overview')">
            Overview
          </button>
          <button class="admin-nav-btn" [class.active]="activeTab() === 'posts'" (click)="activeTab.set('posts')">
            All Posts
          </button>
          <button class="admin-nav-btn" [class.active]="activeTab() === 'comments'" (click)="activeTab.set('comments')">
            Comments
          </button>
          <button class="admin-nav-btn" [class.active]="activeTab() === 'users'" (click)="activeTab.set('users')">
            Users
          </button>
        </nav>
        <button class="btn btn-outline btn-sm btn-block" (click)="logout()" style="margin-top: auto;">Logout</button>
      </div>

      <main class="admin-main">
        @if (activeTab() === 'overview') {
          <div class="overview-section">
            <h1>Dashboard Overview</h1>
            <div class="stats-grid">
              <div class="stat-card card">
                <div class="stat-value">{{ totalPosts() }}</div>
                <div class="stat-label">Total Posts</div>
              </div>
              <div class="stat-card card">
                <div class="stat-value">{{ lostCount() }}</div>
                <div class="stat-label">Lost Pets</div>
              </div>
              <div class="stat-card card">
                <div class="stat-value">{{ foundCount() }}</div>
                <div class="stat-label">Found Pets</div>
              </div>
              <div class="stat-card card">
                <div class="stat-value">{{ rescueCount() }}</div>
                <div class="stat-label">Rescues</div>
              </div>
              <div class="stat-card card">
                <div class="stat-value">{{ adoptionCount() }}</div>
                <div class="stat-label">Adoptions</div>
              </div>
              <div class="stat-card card">
                <div class="stat-value">{{ userCount() }}</div>
                <div class="stat-label">Users</div>
              </div>
              <div class="stat-card card">
                <div class="stat-value">{{ commentCount() }}</div>
                <div class="stat-label">Comments</div>
              </div>
              <div class="stat-card card">
                <div class="stat-value">{{ resolvedCount() }}</div>
                <div class="stat-label">Resolved</div>
              </div>
            </div>

            <div class="recent-section">
              <h2>Recent Posts</h2>
              <div class="recent-list">
                @for (post of recentPosts(); track post.id) {
                  <div class="recent-item">
                    <div class="recent-item-info">
                      <span class="badge badge-{{ post.type }}">{{ post.type }}</span>
                      <span class="recent-item-desc">{{ post.description }}</span>
                      <span class="recent-item-author">by {{ post.userName }}</span>
                    </div>
                    <span class="recent-item-time">{{ post.createdAt | date:'short' }}</span>
                  </div>
                } @empty {
                  <p class="no-data">No posts yet</p>
                }
              </div>
            </div>
          </div>
        }

        @if (activeTab() === 'posts') {
          <div class="posts-section">
            <h1>All Posts</h1>
            <div class="admin-filters">
              <button class="btn btn-sm" [class.btn-primary]="postFilter() === 'all'" [class.btn-outline]="postFilter() !== 'all'" (click)="postFilter.set('all')">All</button>
              <button class="btn btn-sm" [class.btn-primary]="postFilter() === 'lost'" [class.btn-outline]="postFilter() !== 'lost'" (click)="postFilter.set('lost')">Lost</button>
              <button class="btn btn-sm" [class.btn-primary]="postFilter() === 'found'" [class.btn-outline]="postFilter() !== 'found'" (click)="postFilter.set('found')">Found</button>
              <button class="btn btn-sm" [class.btn-primary]="postFilter() === 'rescue'" [class.btn-outline]="postFilter() !== 'rescue'" (click)="postFilter.set('rescue')">Rescue</button>
              <button class="btn btn-sm" [class.btn-primary]="postFilter() === 'adoption'" [class.btn-outline]="postFilter() !== 'adoption'" (click)="postFilter.set('adoption')">Adoption</button>
            </div>
            <div class="admin-posts-list">
              @for (post of filteredAdminPosts(); track post.id) {
                <div class="admin-post-item card">
                  @if (post.imageUrl) {
                    <div class="admin-post-image">
                      <img [src]="post.imageUrl" [alt]="post.description" />
                    </div>
                  }
                  <div class="admin-post-content">
                    <div class="admin-post-header">
                      <span class="badge badge-{{ post.type }}">{{ post.type }}</span>
                      @if (post.resolved) {
                        <span class="badge badge-resolved">Resolved</span>
                      }
                      @if (post.urgencyLevel) {
                        <span class="badge badge-urgency-{{ post.urgencyLevel }}">{{ post.urgencyLevel }}</span>
                      }
                    </div>
                    <p class="admin-post-desc">{{ post.description }}</p>
                    <div class="admin-post-meta">
                      <span>{{ post.location }}</span>
                      <span>{{ post.userName }}</span>
                      <span>{{ post.createdAt | date:'short' }}</span>
                    </div>
                  </div>
                  <div class="admin-post-actions">
                    @if (!post.resolved) {
                      <button class="btn btn-secondary btn-sm" (click)="resolvePost(post.id)">Resolve</button>
                    }
                    <button class="btn btn-danger btn-sm" (click)="deletePost(post.id)">Delete</button>
                  </div>
                </div>
              } @empty {
                <p class="no-data">No posts found</p>
              }
            </div>
          </div>
        }

        @if (activeTab() === 'comments') {
          <div class="comments-section">
            <h1>All Comments</h1>
            <div class="admin-comments-list">
              @for (comment of allComments(); track comment.id) {
                <div class="admin-comment-item card">
                  <div class="admin-comment-avatar">
                    <img [src]="comment.userAvatarUrl" [alt]="comment.userName" />
                  </div>
                  <div class="admin-comment-content">
                    <div class="admin-comment-header">
                      <strong>{{ comment.userName }}</strong>
                      <span class="admin-comment-time">{{ comment.createdAt | date:'short' }}</span>
                    </div>
                    <p>{{ comment.content }}</p>
                    <span class="admin-comment-post">On post: {{ getPostDescription(comment.postId) }}</span>
                  </div>
                  <button class="btn btn-danger btn-sm" (click)="deleteComment(comment.id)">Delete</button>
                </div>
              } @empty {
                <p class="no-data">No comments yet</p>
              }
            </div>
          </div>
        }

        @if (activeTab() === 'users') {
          <div class="users-section">
            <h1>Registered Users</h1>
            <div class="admin-users-list">
              @for (user of allUsers(); track user.id) {
                <div class="admin-user-item card">
                  <div class="admin-user-avatar">
                    <img [src]="user.avatarUrl" [alt]="user.name" />
                  </div>
                  <div class="admin-user-content">
                    <strong>{{ user.name }}</strong>
                    <span class="admin-user-email">{{ user.email }}</span>
                    <span class="admin-user-meta">{{ user.postCount }} posts · Joined {{ user.createdAt | date:'mediumDate' }}</span>
                  </div>
                </div>
              } @empty {
                <p class="no-data">No users registered yet</p>
              }
            </div>
          </div>
        }
      </main>
    </div>
  `,
  styles: [`
    .admin-page {
      display: grid;
      grid-template-columns: 240px 1fr;
      min-height: 100vh;
    }

    .admin-sidebar {
      background: var(--text-primary);
      color: white;
      padding: 1.5rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .admin-brand {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 800;
      font-size: 1.25rem;
      margin-bottom: 0.5rem;
    }

    .brand-icon {
      font-size: 1.5rem;
    }

    .admin-role-badge {
      background: var(--primary);
      color: white;
      padding: 0.375rem 0.75rem;
      border-radius: var(--radius-full);
      font-size: 0.75rem;
      font-weight: 700;
      text-align: center;
      margin-bottom: 1rem;
    }

    .admin-nav {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .admin-nav-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 0.75rem;
      border-radius: var(--radius);
      font-size: 0.875rem;
      font-weight: 600;
      color: rgba(255,255,255,0.7);
      background: transparent;
      transition: var(--transition);
      text-align: left;
    }

    .admin-nav-btn:hover {
      background: rgba(255,255,255,0.1);
      color: white;
    }

    .admin-nav-btn.active {
      background: var(--primary);
      color: white;
    }

    .admin-main {
      padding: 2rem;
      overflow-y: auto;
      max-height: 100vh;
    }

    .admin-main h1 {
      font-size: 1.75rem;
      font-weight: 800;
      margin-bottom: 1.5rem;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      padding: 1.25rem;
      text-align: center;
    }

    .stat-icon {
      font-size: 2rem;
      margin-bottom: 0.5rem;
    }

    .stat-value {
      font-size: 2rem;
      font-weight: 800;
      color: var(--primary-dark);
    }

    .stat-label {
      font-size: 0.8125rem;
      color: var(--text-muted);
      font-weight: 600;
    }

    .recent-section h2, .posts-section h2 {
      font-size: 1.25rem;
      font-weight: 800;
      margin-bottom: 1rem;
    }

    .recent-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .recent-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      background: white;
      border-radius: var(--radius);
      box-shadow: var(--shadow-sm);
    }

    .recent-item-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      min-width: 0;
    }

    .recent-item-desc {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 400px;
      font-size: 0.875rem;
    }

    .recent-item-author {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .recent-item-time {
      font-size: 0.75rem;
      color: var(--text-muted);
      flex-shrink: 0;
    }

    .admin-filters {
      display: flex;
      gap: 0.375rem;
      margin-bottom: 1.25rem;
    }

    .admin-posts-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .admin-post-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
    }

    .admin-post-image {
      width: 80px;
      height: 80px;
      border-radius: var(--radius);
      overflow: hidden;
      flex-shrink: 0;
    }

    .admin-post-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .admin-post-content {
      flex: 1;
      min-width: 0;
    }

    .admin-post-header {
      display: flex;
      gap: 0.375rem;
      margin-bottom: 0.375rem;
    }

    .admin-post-desc {
      font-size: 0.875rem;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .admin-post-meta {
      display: flex;
      gap: 1rem;
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: 0.375rem;
    }

    .admin-post-actions {
      display: flex;
      gap: 0.375rem;
      flex-shrink: 0;
    }

    .admin-comments-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .admin-comment-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.875rem 1rem;
    }

    .admin-comment-avatar {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-full);
      overflow: hidden;
      flex-shrink: 0;
    }

    .admin-comment-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .admin-comment-content {
      flex: 1;
      min-width: 0;
    }

    .admin-comment-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.25rem;
    }

    .admin-comment-header strong {
      font-size: 0.875rem;
    }

    .admin-comment-time {
      font-size: 0.6875rem;
      color: var(--text-muted);
    }

    .admin-comment-content p {
      font-size: 0.8125rem;
      color: var(--text-secondary);
    }

    .admin-comment-post {
      font-size: 0.6875rem;
      color: var(--primary-dark);
      font-weight: 600;
    }

    .admin-users-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .admin-user-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.875rem 1rem;
    }

    .admin-user-avatar {
      width: 42px;
      height: 42px;
      border-radius: var(--radius-full);
      overflow: hidden;
      flex-shrink: 0;
    }

    .admin-user-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .admin-user-content {
      display: flex;
      flex-direction: column;
    }

    .admin-user-content strong {
      font-size: 0.9375rem;
    }

    .admin-user-email {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .admin-user-meta {
      font-size: 0.6875rem;
      color: var(--text-muted);
    }

    .no-data {
      text-align: center;
      color: var(--text-muted);
      padding: 2rem;
    }

    @media (max-width: 768px) {
      .admin-page {
        grid-template-columns: 1fr;
      }

      .admin-sidebar {
        flex-direction: row;
        flex-wrap: wrap;
        padding: 1rem;
      }

      .admin-nav {
        flex-direction: row;
        flex-wrap: wrap;
      }

      .admin-main {
        max-height: none;
      }
    }
  `]
})
export class AdminComponent {
  private authService = inject(AuthService);
  postService = inject(PostService);
  commentService = inject(CommentService);
  private router = inject(Router);

  activeTab = signal<'overview' | 'posts' | 'comments' | 'users'>('overview');
  postFilter = signal<string>('all');

  totalPosts = computed(() => this.postService.posts().length);
  lostCount = computed(() => this.postService.posts().filter(p => p.type === 'lost').length);
  foundCount = computed(() => this.postService.posts().filter(p => p.type === 'found').length);
  rescueCount = computed(() => this.postService.posts().filter(p => p.type === 'rescue').length);
  adoptionCount = computed(() => this.postService.posts().filter(p => p.type === 'adoption').length);
  resolvedCount = computed(() => this.postService.posts().filter(p => p.resolved).length);
  userCount = computed(() => this.authService.getAllUsers().length);
  commentCount = computed(() => this.commentService.comments().length);

  recentPosts = computed(() =>
    [...this.postService.posts()]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)
  );

  filteredAdminPosts = computed(() => {
    const f = this.postFilter();
    const posts = f === 'all' ? this.postService.posts() : this.postService.posts().filter(p => p.type === f);
    return [...posts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  });

  allComments = computed(() =>
    [...this.commentService.comments()]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  );

  allUsers = computed(() => this.authService.getAllUsers());

  getPostDescription(postId: string): string {
    const post = this.postService.getPostById(postId);
    return post ? post.description.substring(0, 50) + (post.description.length > 50 ? '...' : '') : 'Deleted post';
  }

  resolvePost(postId: string): void {
    this.postService.resolvePost(postId);
  }

  deletePost(postId: string): void {
    if (confirm('Are you sure you want to delete this post?')) {
      this.postService.deletePost(postId);
    }
  }

  deleteComment(commentId: string): void {
    if (confirm('Are you sure you want to delete this comment?')) {
      this.commentService.deleteComment(commentId);
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
