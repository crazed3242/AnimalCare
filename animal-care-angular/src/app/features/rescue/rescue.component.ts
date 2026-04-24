import { Component, inject, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PostService } from '../../core/services/post.service';
import { CommentService } from '../../core/services/comment.service';
import { MessageService } from '../../core/services/message.service';
import { PostCardComponent } from '../../shared/post-card/post-card.component';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { Post } from '../../core/models/post.model';

@Component({
  selector: 'app-rescue',
  standalone: true,
  imports: [PostCardComponent, NavbarComponent, RouterLink],
  template: `
    <app-navbar />

    <div class="category-page">
      <div class="category-header">
        <div class="category-info">
          <h1>Rescue Animals</h1>
          <p>Report animals in need of urgent help</p>
        </div>
        <a routerLink="/create-post/rescue" class="btn btn-primary">Report Rescue</a>
      </div>

      <div class="category-filters">
        <button class="btn btn-sm" [class.btn-primary]="filter() === 'all'" [class.btn-outline]="filter() !== 'all'" (click)="filter.set('all')">All</button>
        <button class="btn btn-sm" [class.btn-primary]="filter() === 'high'" [class.btn-outline]="filter() !== 'high'" (click)="filter.set('high')">High Urgency</button>
        <button class="btn btn-sm" [class.btn-primary]="filter() === 'medium'" [class.btn-outline]="filter() !== 'medium'" (click)="filter.set('medium')">Medium</button>
        <button class="btn btn-sm" [class.btn-primary]="filter() === 'low'" [class.btn-outline]="filter() !== 'low'" (click)="filter.set('low')">Low</button>
      </div>

      <div class="posts-grid">
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
            <h3>No rescue reports yet</h3>
            <p>Help by reporting an animal in need!</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .category-page {
      max-width: 800px;
      margin: 0 auto;
      padding: 1.5rem 1rem;
    }

    .category-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .category-header h1 {
      font-size: 1.75rem;
      font-weight: 800;
    }

    .category-header p {
      color: var(--text-muted);
      margin-top: 0.25rem;
    }

    .category-filters {
      display: flex;
      gap: 0.375rem;
      margin-bottom: 1.25rem;
    }

    .posts-grid {
      display: flex;
      flex-direction: column;
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
    }
  `]
})
export class RescueComponent {
  postService = inject(PostService);
  commentService = inject(CommentService);
  messageService = inject(MessageService);
  private router = inject(Router);

  filter = signal<'all' | 'high' | 'medium' | 'low'>('all');

  filteredPosts = computed(() => {
    const posts = this.postService.posts().filter(p => p.type === 'rescue');
    const f = this.filter();
    const filtered = f === 'all' ? posts : posts.filter(p => p.urgencyLevel === f);
    return [...filtered].sort((a, b) => {
      const urgencyOrder = { high: 0, medium: 1, low: 2 };
      const urgencyDiff = (urgencyOrder[a.urgencyLevel ?? 'low'] ?? 2) - (urgencyOrder[b.urgencyLevel ?? 'low'] ?? 2);
      if (urgencyDiff !== 0) return urgencyDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  });

  onResolve(postId: string): void {
    const post = this.postService.getPostById(postId);
    if (post) {
      post.resolved ? this.postService.unresolvePost(postId) : this.postService.resolvePost(postId);
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
