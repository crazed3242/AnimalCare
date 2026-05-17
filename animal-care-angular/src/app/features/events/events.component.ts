import { Component, inject, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PostService } from '../../core/services/post.service';
import { CommentService } from '../../core/services/comment.service';
import { MessageService } from '../../core/services/message.service';
import { AuthService } from '../../core/services/auth.service';
import { PostCardComponent } from '../../shared/post-card/post-card.component';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { Post, EventStatus } from '../../core/models/post.model';
import { navigateToMessageFromPost } from '../../core/utils/message-navigation';
import { isPostVisibleToViewer } from '../../core/utils/post-visibility';

type StatusFilter = 'all' | EventStatus;

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [PostCardComponent, NavbarComponent],
  template: `
    <app-navbar />

    <div class="events-page">
      <div class="events-header">
        <h1>Community Events &amp; Programs</h1>
        <p>Dog shows, pet shows, fundraisers, workshops &mdash; propose your own and the community can join.</p>
      </div>

      <div class="events-controls card">
        <div class="filter-buttons">
          <button class="btn btn-sm" [class.btn-primary]="statusFilter() === 'all'" [class.btn-outline]="statusFilter() !== 'all'" (click)="statusFilter.set('all')">All</button>
          <button class="btn btn-sm" [class.btn-primary]="statusFilter() === 'approved'" [class.btn-outline]="statusFilter() !== 'approved'" (click)="statusFilter.set('approved')">Approved</button>
          <button class="btn btn-sm" [class.btn-primary]="statusFilter() === 'proposed'" [class.btn-outline]="statusFilter() !== 'proposed'" (click)="statusFilter.set('proposed')">Pending</button>
          @if (authService.isAdmin()) {
            <button class="btn btn-sm" [class.btn-primary]="statusFilter() === 'rejected'" [class.btn-outline]="statusFilter() !== 'rejected'" (click)="statusFilter.set('rejected')">Rejected</button>
          }
        </div>
        <span class="event-count">{{ filteredPosts().length }} event(s)</span>
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
            (approveEvent)="onApproveEvent($event)"
            (rejectEvent)="onRejectEvent($event)"
          />
        } @empty {
          <div class="empty-state">
            <h3>No events to show</h3>
            <p>Be the first to propose a dog show, pet show, or community program from the feed.</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .events-page {
      max-width: 800px;
      margin: 0 auto;
      padding: 1.5rem 1rem;
    }

    .events-header {
      margin-bottom: 1rem;
    }

    .events-header h1 {
      font-size: 1.75rem;
      font-weight: 800;
    }

    .events-header p {
      color: var(--text-muted);
      margin-top: 0.25rem;
    }

    .events-controls {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      margin-bottom: 1rem;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .filter-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
    }

    .event-count {
      font-size: 0.8125rem;
      color: var(--text-muted);
      font-weight: 600;
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
export class EventsComponent {
  postService = inject(PostService);
  commentService = inject(CommentService);
  messageService = inject(MessageService);
  authService = inject(AuthService);
  private router = inject(Router);

  statusFilter = signal<StatusFilter>('all');

  filteredPosts = computed(() => {
    const me = this.authService.currentUser();
    const viewer = { viewerId: me?.id, isAdmin: this.authService.isAdmin() };
    const status = this.statusFilter();

    return this.postService.posts()
      .filter(p => p.type === 'event')
      .filter(p => isPostVisibleToViewer(p, viewer))
      .filter(p => status === 'all' ? true : p.eventStatus === status)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  });

  onResolve(postId: string): void {
    const post = this.postService.getPostById(postId);
    if (post) {
      post.resolved ? this.postService.unresolvePost(postId) : this.postService.resolvePost(postId);
    }
  }

  onDelete(postId: string): void {
    if (confirm('Are you sure you want to delete this event?')) {
      this.postService.deletePost(postId);
    }
  }

  onMessage(post: Post): void {
    navigateToMessageFromPost(this.router, post);
  }

  onDeleteComment(commentId: string): void {
    this.commentService.deleteComment(commentId);
  }

  onAddComment(event: { postId: string; content: string }): void {
    this.commentService.addComment(event.postId, event.content);
  }

  onApproveEvent(postId: string): void {
    if (confirm('Approve this proposed event?')) {
      this.postService.decideEvent(postId, 'approved');
    }
  }

  onRejectEvent(postId: string): void {
    if (confirm('Reject this proposed event?')) {
      this.postService.decideEvent(postId, 'rejected');
    }
  }
}
