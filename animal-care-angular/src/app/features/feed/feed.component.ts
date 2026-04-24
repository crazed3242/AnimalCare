import { Component, inject, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PostService } from '../../core/services/post.service';
import { CommentService } from '../../core/services/comment.service';
import { MessageService } from '../../core/services/message.service';
import { AuthService } from '../../core/services/auth.service';
import { PostCardComponent } from '../../shared/post-card/post-card.component';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { Post, PostType } from '../../core/models/post.model';

@Component({
  selector: 'app-feed',
  standalone: true,
  imports: [PostCardComponent, NavbarComponent, RouterLink],
  template: `
    <app-navbar />

    <div class="feed-page">
      <div class="feed-layout">
        <aside class="feed-sidebar">
          <div class="sidebar-card card">
            <h3>Quick Links</h3>
            <nav class="sidebar-nav">
              <a routerLink="/create-post/lost" class="sidebar-link">
                Report Lost Pet
              </a>
              <a routerLink="/create-post/found" class="sidebar-link">
                Report Found Pet
              </a>
              <a routerLink="/create-post/rescue" class="sidebar-link">
                Report Rescue
              </a>
              <a routerLink="/create-post/adoption" class="sidebar-link">
                Post for Adoption
              </a>
            </nav>
          </div>

          <div class="sidebar-card card">
            <h3>Filter by Type</h3>
            <div class="filter-buttons">
              <button class="btn btn-sm" [class.btn-primary]="filter() === 'all'" [class.btn-outline]="filter() !== 'all'" (click)="filter.set('all')">All</button>
              <button class="btn btn-sm" [class.btn-primary]="filter() === 'lost'" [class.btn-outline]="filter() !== 'lost'" (click)="filter.set('lost')">Lost</button>
              <button class="btn btn-sm" [class.btn-primary]="filter() === 'found'" [class.btn-outline]="filter() !== 'found'" (click)="filter.set('found')">Found</button>
              <button class="btn btn-sm" [class.btn-primary]="filter() === 'rescue'" [class.btn-outline]="filter() !== 'rescue'" (click)="filter.set('rescue')">Rescue</button>
              <button class="btn btn-sm" [class.btn-primary]="filter() === 'adoption'" [class.btn-outline]="filter() !== 'adoption'" (click)="filter.set('adoption')">Adoption</button>
            </div>
          </div>
        </aside>

        <main class="feed-main">
          <div class="feed-header">
            <h2>Community Feed</h2>
            <a routerLink="/create-post/lost" class="btn btn-primary">+ Create Post</a>
          </div>

          @for (post of filteredPosts(); track post.id) {
            <app-post-card
              [post]="post"
              (resolve)="onResolve($event)"
              (delete)="onDelete($event)"
              (message)="onMessage($event)"
              (deleteComment)="onDeleteComment($event)"
              (addComment)="onAddComment($event)"
            />
          } @empty {
            <div class="empty-state">
              <h3>No posts yet</h3>
              <p>Be the first to help an animal in need!</p>
              <a routerLink="/create-post/lost" class="btn btn-primary">Create a Post</a>
            </div>
          }
        </main>
      </div>
    </div>
  `,
  styles: [`
    .feed-page {
      max-width: 1200px;
      margin: 0 auto;
      padding: 1.5rem 1rem;
    }

    .feed-layout {
      display: grid;
      grid-template-columns: 260px 1fr;
      gap: 1.5rem;
      align-items: start;
    }

    .feed-sidebar {
      position: sticky;
      top: 80px;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .sidebar-card {
      padding: 1.25rem;
    }

    .sidebar-card h3 {
      font-size: 0.9375rem;
      font-weight: 800;
      margin-bottom: 0.75rem;
      color: var(--text-primary);
    }

    .sidebar-nav {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .sidebar-link {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.625rem;
      border-radius: var(--radius);
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-secondary);
      transition: var(--transition);
    }

    .sidebar-link:hover {
      background: var(--bg-secondary);
      color: var(--primary-dark);
    }

    .filter-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
    }

    .feed-main {
      min-width: 0;
    }

    .feed-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.25rem;
    }

    .feed-header h2 {
      font-size: 1.5rem;
      font-weight: 800;
      color: var(--text-primary);
    }

    .empty-state {
      text-align: center;
      padding: 3rem 1rem;
      background: white;
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow);
    }

    .empty-icon {
      font-size: 3rem;
      display: block;
      margin-bottom: 1rem;
    }

    .empty-state h3 {
      font-size: 1.25rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
    }

    .empty-state p {
      color: var(--text-muted);
      margin-bottom: 1.25rem;
    }

    @media (max-width: 768px) {
      .feed-layout {
        grid-template-columns: 1fr;
      }

      .feed-sidebar {
        position: static;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.75rem;
      }
    }
  `]
})
export class FeedComponent {
  postService = inject(PostService);
  commentService = inject(CommentService);
  messageService = inject(MessageService);
  authService = inject(AuthService);
  private router = inject(Router);

  filter = signal<PostType | 'all'>('all');

  filteredPosts = computed(() => {
    const posts = this.postService.posts();
    const f = this.filter();
    const filtered = f === 'all' ? posts : posts.filter(p => p.type === f);
    return [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  });

  onResolve(postId: string): void {
    const post = this.postService.getPostById(postId);
    if (post) {
      if (post.resolved) {
        this.postService.unresolvePost(postId);
      } else {
        this.postService.resolvePost(postId);
      }
    }
  }

  onDelete(postId: string): void {
    if (confirm('Are you sure you want to delete this post?')) {
      this.postService.deletePost(postId);
    }
  }

  onMessage(post: Post): void {
    this.router.navigate(['/messages', post.userId]);
  }

  onDeleteComment(commentId: string): void {
    this.commentService.deleteComment(commentId);
  }

  onAddComment(event: { postId: string; content: string }): void {
    this.commentService.addComment(event.postId, event.content);
  }
}
