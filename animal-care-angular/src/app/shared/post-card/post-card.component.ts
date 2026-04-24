import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Post } from '../../core/models/post.model';
import { AuthService } from '../../core/services/auth.service';
import { CommentService } from '../../core/services/comment.service';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-post-card',
  standalone: true,
  imports: [RouterLink, DatePipe, FormsModule],
  template: `
    <article class="post-card card">
      <div class="post-header">
        <div class="post-user">
          <a [routerLink]="['/profile', post.userId]" class="post-avatar">
            <img [src]="post.userAvatarUrl" [alt]="post.userName" />
          </a>
          <div>
            <a [routerLink]="['/profile', post.userId]" class="post-username">{{ post.userName }}</a>
            <span class="post-time">{{ post.createdAt | date:'short' }}</span>
          </div>
        </div>
        <div class="post-badges">
          <span class="badge badge-{{ post.type }}">{{ post.type }}</span>
          @if (post.urgencyLevel) {
            <span class="badge badge-urgency-{{ post.urgencyLevel }}">{{ post.urgencyLevel }} urgency</span>
          }
          @if (post.resolved) {
            <span class="badge badge-resolved">Resolved</span>
          }
        </div>
      </div>

      @if (post.imageUrl) {
        <div class="post-image">
          <img [src]="post.imageUrl" [alt]="post.description" />
        </div>
      }

      <div class="post-content">
        <p class="post-description">{{ post.description }}</p>

        <div class="post-details">
          <div class="detail-item">
            <span class="detail-label">Location:</span>
            <span>{{ post.location }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Date:</span>
            <span>{{ post.date | date:'mediumDate' }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Contact:</span>
            <span>{{ post.contactInfo }}</span>
          </div>
          @if (post.breed) {
            <div class="detail-item">
              <span class="detail-label">Breed:</span>
              <span>{{ post.breed }}</span>
            </div>
          }
          @if (post.age) {
            <div class="detail-item">
              <span class="detail-label">Age:</span>
              <span>{{ post.age }}</span>
            </div>
          }
          @if (post.healthCondition) {
            <div class="detail-item">
              <span class="detail-label">Health:</span>
              <span>{{ post.healthCondition }}</span>
            </div>
          }
          @if (post.adoptionRequirements) {
            <div class="detail-item">
              <span class="detail-label">Requirements:</span>
              <span>{{ post.adoptionRequirements }}</span>
            </div>
          }
        </div>
      </div>

      <div class="post-actions">
        @if (authService.currentUser()?.id === post.userId) {
          <button class="btn btn-ghost btn-sm" (click)="resolve.emit(post.id)">
            {{ post.resolved ? 'Unresolve' : 'Resolve' }}
          </button>
          <button class="btn btn-ghost btn-sm" (click)="delete.emit(post.id)" style="color: var(--danger);">
            Delete
          </button>
        }
        @if (authService.currentUser()?.id !== post.userId) {
          <button class="btn btn-ghost btn-sm" (click)="message.emit(post)">
            Message
          </button>
        }
        <button class="btn btn-ghost btn-sm" (click)="toggleComments()">
          Comments ({{ commentCount() }})
        </button>
      </div>

      @if (showComments()) {
        <div class="comments-section">
          <div class="comments-list">
            @for (comment of comments(); track comment.id) {
              <div class="comment-item">
                <a [routerLink]="['/profile', comment.userId]" class="comment-avatar">
                  <img [src]="comment.userAvatarUrl" [alt]="comment.userName" />
                </a>
                <div class="comment-body">
                  <div class="comment-meta">
                    <a [routerLink]="['/profile', comment.userId]" class="comment-name">{{ comment.userName }}</a>
                    <span class="comment-time">{{ comment.createdAt | date:'short' }}</span>
                  </div>
                  <p class="comment-text">{{ comment.content }}</p>
                </div>
                @if (authService.currentUser()?.id === comment.userId || authService.isAdmin()) {
                  <button class="btn btn-ghost btn-sm comment-delete" (click)="deleteComment.emit(comment.id)" style="color: var(--danger);">✕</button>
                }
              </div>
            }
            @if (comments().length === 0) {
              <p class="no-comments">No comments yet. Be the first!</p>
            }
          </div>
          <div class="comment-form">
            <input
              type="text"
              class="input-field"
              placeholder="Write a comment..."
              [(ngModel)]="newComment"
              (keyup.enter)="submitComment()"
            />
            <button class="btn btn-primary btn-sm" (click)="submitComment()" [disabled]="!newComment.trim()">Post</button>
          </div>
        </div>
      }
    </article>
  `,
  styles: [`
    .post-card {
      margin-bottom: 1.25rem;
    }

    .post-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.25rem 0.75rem;
    }

    .post-user {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .post-avatar {
      width: 42px;
      height: 42px;
      border-radius: var(--radius-full);
      overflow: hidden;
      flex-shrink: 0;
    }

    .post-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .post-username {
      font-weight: 700;
      font-size: 0.9375rem;
      color: var(--text-primary);
    }

    .post-username:hover {
      color: var(--primary-dark);
    }

    .post-time {
      display: block;
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: 0.125rem;
    }

    .post-badges {
      display: flex;
      gap: 0.375rem;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .post-image {
      width: 100%;
      max-height: 400px;
      overflow: hidden;
      margin: 0.75rem 0;
    }

    .post-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .post-content {
      padding: 0 1.25rem;
    }

    .post-description {
      font-size: 0.9375rem;
      line-height: 1.5;
      color: var(--text-primary);
      margin-bottom: 0.75rem;
    }

    .post-details {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem 1.25rem;
      font-size: 0.8125rem;
      color: var(--text-secondary);
    }

    .detail-item {
      display: flex;
      align-items: center;
      gap: 0.375rem;
    }

    .detail-label {
      font-weight: 600;
      color: var(--text-muted);
      font-size: 0.8125rem;
    }

    .post-actions {
      display: flex;
      gap: 0.25rem;
      padding: 0.75rem 1.25rem;
      border-top: 1px solid var(--border);
      margin-top: 0.75rem;
    }

    .comments-section {
      border-top: 1px solid var(--border);
      padding: 0.75rem 1.25rem;
    }

    .comments-list {
      max-height: 250px;
      overflow-y: auto;
      margin-bottom: 0.75rem;
    }

    .comment-item {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      padding: 0.5rem 0;
    }

    .comment-avatar {
      width: 28px;
      height: 28px;
      border-radius: var(--radius-full);
      overflow: hidden;
      flex-shrink: 0;
    }

    .comment-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .comment-body {
      flex: 1;
      min-width: 0;
    }

    .comment-meta {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .comment-name {
      font-weight: 700;
      font-size: 0.8125rem;
      color: var(--text-primary);
    }

    .comment-name:hover {
      color: var(--primary-dark);
    }

    .comment-time {
      font-size: 0.6875rem;
      color: var(--text-muted);
    }

    .comment-text {
      font-size: 0.8125rem;
      color: var(--text-secondary);
      margin-top: 0.125rem;
      line-height: 1.4;
    }

    .comment-delete {
      flex-shrink: 0;
      font-size: 0.75rem;
      padding: 0.25rem;
    }

    .no-comments {
      text-align: center;
      color: var(--text-muted);
      font-size: 0.8125rem;
      padding: 1rem 0;
    }

    .comment-form {
      display: flex;
      gap: 0.5rem;
    }

    .comment-form input {
      flex: 1;
    }
  `]
})
export class PostCardComponent {
  @Input() post!: Post;
  @Output() resolve = new EventEmitter<string>();
  @Output() delete = new EventEmitter<string>();
  @Output() message = new EventEmitter<Post>();
  @Output() deleteComment = new EventEmitter<string>();
  @Output() addComment = new EventEmitter<{ postId: string; content: string }>();

  authService = inject(AuthService);
  commentService = inject(CommentService);

  showComments = signal(false);
  newComment = '';
  comments = signal<any[]>([]);
  commentCount = signal(0);

  ngOnChanges(): void {
    this.commentCount.set(this.commentService.getCommentCount(this.post.id));
  }

  toggleComments(): void {
    this.showComments.update(v => !v);
    if (this.showComments()) {
      this.comments.set(this.commentService.getCommentsByPost(this.post.id));
      this.commentCount.set(this.comments().length);
    }
  }

  submitComment(): void {
    if (!this.newComment.trim()) return;
    this.addComment.emit({ postId: this.post.id, content: this.newComment });
    this.newComment = '';
    this.comments.set(this.commentService.getCommentsByPost(this.post.id));
    this.commentCount.set(this.comments().length);
  }
}
