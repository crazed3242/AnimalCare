import { Component, Input, Output, EventEmitter, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Post, getPostImageUrls } from '../../core/models/post.model';
import { Reservation } from '../../core/models/reservation.model';
import { AuthService } from '../../core/services/auth.service';
import { CommentService } from '../../core/services/comment.service';
import { TransactionService } from '../../core/services/transaction.service';
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
          @if (post.type === 'adoption' && post.reservationStatus === 'reserved') {
            <span class="badge badge-reserved" title="An adoption request is under review">Request pending</span>
          }
          @if (post.type === 'adoption' && post.reservationStatus === 'adopted') {
            <span class="badge badge-adopted" title="Adoption complete">Adopted</span>
          }
          @if (post.type === 'event' && post.eventCategory) {
            <span class="badge badge-event-cat">{{ formatEventCategory(post.eventCategory) }}</span>
          }
          @if (post.type === 'event' && post.eventStatus === 'proposed') {
            <span class="badge badge-event-proposed" title="Awaiting admin approval">Pending Approval</span>
          }
          @if (post.type === 'event' && post.eventStatus === 'approved') {
            <span class="badge badge-event-approved" title="Approved by admin">Approved</span>
          }
          @if (post.type === 'event' && post.eventStatus === 'rejected') {
            <span class="badge badge-event-rejected" title="Rejected by admin">Rejected</span>
          }
        </div>
      </div>

      @if (postImages().length > 0) {
        <div class="post-images" [class.post-images-multi]="postImages().length > 1">
          @for (url of postImages(); track url; let i = $index) {
            <button class="post-image" type="button" (click)="openImagePreview(i)" [attr.aria-label]="'View image ' + (i + 1) + ' of ' + postImages().length">
              <img [src]="url" [alt]="post.description + ' - photo ' + (i + 1)" />
            </button>
          }
          @if (postImages().length > 1) {
            <span class="post-image-count">{{ postImages().length }} photos</span>
          }
        </div>
      }

      <div class="post-content">
        @if (post.type === 'event' && post.eventName) {
          <h3 class="event-title">{{ post.eventName }}</h3>
        }
        <p class="post-description">{{ post.description }}</p>

        <div class="post-details">
          <div class="detail-item">
            <span class="detail-label">{{ post.type === 'event' ? 'Venue:' : 'Location:' }}</span>
            <span class="detail-value">{{ post.location }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">{{ post.type === 'event' ? 'Starts:' : 'Date:' }}</span>
            <span class="detail-value">{{ post.date | date:'mediumDate' }}</span>
          </div>
          @if (post.type === 'event' && post.eventEndDate) {
            <div class="detail-item">
              <span class="detail-label">Ends:</span>
              <span class="detail-value">{{ post.eventEndDate | date:'mediumDate' }}</span>
            </div>
          }
          @if (post.type === 'event' && post.organizerName) {
            <div class="detail-item">
              <span class="detail-label">Organizer:</span>
              <span class="detail-value">{{ post.organizerName }}</span>
            </div>
          }
          @if (post.type === 'event' && post.expectedAttendees) {
            <div class="detail-item">
              <span class="detail-label">Attendees:</span>
              <span class="detail-value">{{ post.expectedAttendees }}</span>
            </div>
          }
          <div class="detail-item">
            <span class="detail-label">Contact:</span>
            <span class="detail-value">{{ post.contactInfo }}</span>
          </div>
          @if (post.breed) {
            <div class="detail-item">
              <span class="detail-label">Breed:</span>
              <span class="detail-value">{{ post.breed }}</span>
            </div>
          }
          @if (post.age) {
            <div class="detail-item">
              <span class="detail-label">Age:</span>
              <span class="detail-value">{{ post.age }}</span>
            </div>
          }
          @if (post.healthCondition) {
            <div class="detail-item">
              <span class="detail-label">Health:</span>
              <span class="detail-value">{{ post.healthCondition }}</span>
            </div>
          }
          @if (post.adoptionRequirements) {
            <div class="detail-item">
              <span class="detail-label">Requirements:</span>
              <span class="detail-value">{{ post.adoptionRequirements }}</span>
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
          <button class="btn btn-ghost btn-sm" (click)="message.emit(post)" title="Send a private message to the listing owner">
            Message
          </button>
          @if (canRequestAdoption()) {
            <button class="btn btn-primary btn-sm" (click)="toggleReserveForm()" title="Submit a formal adoption request for the owner to review">
              {{ showReserveForm() ? 'Close' : 'Submit adoption request' }}
            </button>
          }
          @if (myPendingReservation()) {
            <button class="btn btn-outline btn-sm" (click)="cancelMyReservation()" [disabled]="txBusy()">
              Cancel request
            </button>
          }
        }
        @if (post.type === 'event' && post.eventStatus === 'proposed' && authService.isAdmin()) {
          <button class="btn btn-primary btn-sm" (click)="approveEvent.emit(post.id)">
            Approve
          </button>
          <button class="btn btn-outline btn-sm" (click)="rejectEvent.emit(post.id)" style="color: var(--danger); border-color: var(--danger);">
            Reject
          </button>
        }
        <button class="btn btn-ghost btn-sm" (click)="toggleComments()">
          Comments ({{ commentCount() }})
        </button>
      </div>

      @if (post.type === 'event' && (post.eventStatus === 'approved' || post.eventStatus === 'rejected') && post.eventDecidedBy) {
        <div class="event-decision-note">
          {{ post.eventStatus === 'approved' ? 'Approved' : 'Rejected' }} by {{ post.eventDecidedBy }}
          @if (post.eventDecidedAt) {
            on {{ post.eventDecidedAt | date:'short' }}
          }
        </div>
      }

      @if (post.type === 'adoption') {
        <div class="reservation-panel">
          @if (!isOwner() && authService.currentUser()) {
            <p class="adoption-help">
              <strong>Message</strong> is for informal questions.
              <strong>Submit adoption request</strong> notifies the owner and holds the listing while they review your application.
            </p>
          }
          @if (showReserveForm() && canRequestAdoption()) {
            <div class="reserve-form">
              <label class="reserve-label">Tell {{ post.userName }} why you'd be a great adopter:</label>
              <textarea
                class="input-field"
                rows="2"
                placeholder="A short note about your home, experience, etc."
                [(ngModel)]="reserveMessage"
              ></textarea>
              <div class="reserve-actions">
                <button class="btn btn-primary btn-sm" (click)="submitReservation()" [disabled]="txBusy() || !reserveMessage.trim()">
                  {{ txBusy() ? 'Submitting...' : 'Submit adoption request' }}
                </button>
                @if (txError()) {
                  <span class="reserve-error">{{ txError() }}</span>
                }
              </div>
            </div>
          }

          @if (isOwner()) {
            <p class="adoption-help owner-adoption-help">
              Review formal requests below. Use <strong>Message</strong> only for informal follow-up.
            </p>
          }
          @if (isOwner() && pendingReservations().length > 0) {
            <div class="owner-decisions">
              <h4 class="reserve-heading">Pending adoption requests</h4>
              @for (r of pendingReservations(); track r.id) {
                <div class="decision-row">
                  <img class="decision-avatar" [src]="r.requesterAvatarUrl" [alt]="r.requesterName" />
                  <div class="decision-body">
                    <strong>{{ r.requesterName }}</strong>
                    <p class="decision-msg">{{ r.message }}</p>
                    <span class="decision-time">{{ r.createdAt | date:'short' }}</span>
                  </div>
                  <div class="decision-actions">
                    <button class="btn btn-primary btn-sm" (click)="approveReservation(r.id)" [disabled]="txBusy()">Approve</button>
                    <button class="btn btn-outline btn-sm" (click)="rejectReservation(r.id)" [disabled]="txBusy()">Reject</button>
                  </div>
                </div>
              }
            </div>
          }

          @if (decidedReservations().length > 0 && (isOwner() || hasMyReservation())) {
            <details class="reservation-history">
              <summary>Reservation history ({{ decidedReservations().length }})</summary>
              @for (r of decidedReservations(); track r.id) {
                <div class="history-row">
                  <span class="badge badge-{{ r.status }}">{{ r.status }}</span>
                  <span>{{ r.requesterName }}</span>
                  <span class="history-time">{{ (r.decidedAt || r.createdAt) | date:'short' }}</span>
                </div>
              }
            </details>
          }
        </div>
      }

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

      @if (showImagePreview()) {
        <div class="image-preview-backdrop" (click)="closeImagePreview()">
          <div class="image-preview-dialog" (click)="$event.stopPropagation()">
            <button class="image-preview-close" type="button" (click)="closeImagePreview()" aria-label="Close image preview">
              ✕
            </button>
            @if (postImages().length > 1) {
              <button class="image-preview-nav image-preview-prev" type="button" (click)="prevPreviewImage($event)" aria-label="Previous image">‹</button>
            }
            <img [src]="previewImageUrl()" [alt]="post.description" />
            @if (postImages().length > 1) {
              <button class="image-preview-nav image-preview-next" type="button" (click)="nextPreviewImage($event)" aria-label="Next image">›</button>
              <span class="image-preview-counter">{{ previewImageIndex() + 1 }} / {{ postImages().length }}</span>
            }
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

    .post-images {
      position: relative;
      margin: 0.75rem 0;
    }

    .post-images-multi {
      display: flex;
      gap: 0.25rem;
      overflow-x: auto;
      scroll-snap-type: x mandatory;
      padding: 0 1.25rem;
    }

    .post-images-multi .post-image {
      flex: 0 0 min(85%, 320px);
      scroll-snap-align: start;
    }

    .post-image {
      width: 100%;
      max-height: 400px;
      overflow: hidden;
      border: none;
      padding: 0;
      background: transparent;
      cursor: pointer;
    }

    .post-image img {
      width: 100%;
      height: 100%;
      max-height: 400px;
      object-fit: cover;
      display: block;
    }

    .post-image-count {
      position: absolute;
      bottom: 0.75rem;
      right: 1.5rem;
      background: rgba(0, 0, 0, 0.6);
      color: #fff;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.25rem 0.5rem;
      border-radius: var(--radius);
      pointer-events: none;
    }

    .image-preview-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      z-index: 1000;
    }

    .image-preview-dialog {
      position: relative;
      max-width: min(90vw, 980px);
      max-height: 90vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .image-preview-dialog img {
      width: 100%;
      max-height: 90vh;
      object-fit: contain;
      border-radius: var(--radius);
      box-shadow: var(--shadow-lg);
    }

    .image-preview-close {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      width: 2rem;
      height: 2rem;
      border: none;
      border-radius: var(--radius-full);
      background: rgba(0, 0, 0, 0.55);
      color: #fff;
      font-size: 1rem;
      line-height: 1;
      cursor: pointer;
      z-index: 2;
    }

    .image-preview-nav {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 2.5rem;
      height: 2.5rem;
      border: none;
      border-radius: var(--radius-full);
      background: rgba(0, 0, 0, 0.55);
      color: #fff;
      font-size: 1.5rem;
      line-height: 1;
      cursor: pointer;
      z-index: 2;
    }

    .image-preview-prev {
      left: 0.5rem;
    }

    .image-preview-next {
      right: 0.5rem;
    }

    .image-preview-counter {
      position: absolute;
      bottom: 0.5rem;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.55);
      color: #fff;
      font-size: 0.8125rem;
      padding: 0.25rem 0.625rem;
      border-radius: var(--radius-full);
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
      font-weight: 400;
      color: var(--text-secondary);
      font-size: 0.8125rem;
    }

    .detail-value {
      font-weight: 700;
      color: var(--text-primary);
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

    .badge-reserved {
      background: rgba(245, 158, 11, 0.15);
      color: #b45309;
    }

    .badge-adopted {
      background: rgba(16, 185, 129, 0.15);
      color: #047857;
    }

    .event-title {
      font-size: 1.125rem;
      font-weight: 800;
      color: var(--text-primary);
      margin-bottom: 0.5rem;
    }

    .badge-event-cat {
      background: #EDE9FE;
      color: #5B21B6;
    }

    .badge-event-proposed {
      background: rgba(245, 158, 11, 0.18);
      color: #b45309;
    }

    .badge-event-approved {
      background: rgba(16, 185, 129, 0.18);
      color: #047857;
    }

    .badge-event-rejected {
      background: rgba(239, 68, 68, 0.18);
      color: #b91c1c;
    }

    .event-decision-note {
      padding: 0.5rem 1.25rem;
      font-size: 0.75rem;
      color: var(--text-muted);
      border-top: 1px dashed var(--border);
    }

    .badge-pending { background: rgba(245, 158, 11, 0.15); color: #b45309; }
    .badge-approved { background: rgba(16, 185, 129, 0.15); color: #047857; }
    .badge-rejected { background: rgba(239, 68, 68, 0.15); color: #b91c1c; }
    .badge-cancelled { background: rgba(107, 114, 128, 0.15); color: #374151; }

    .reservation-panel {
      border-top: 1px solid var(--border);
      padding: 0.75rem 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .adoption-help {
      font-size: 0.8125rem;
      color: var(--text-secondary);
      line-height: 1.45;
      margin: 0;
      padding: 0.5rem 0.75rem;
      background: var(--bg-soft, #f9fafb);
      border-radius: var(--radius);
    }

    .reserve-label {
      display: block;
      font-size: 0.8125rem;
      font-weight: 600;
      margin-bottom: 0.375rem;
    }

    .reserve-form textarea {
      width: 100%;
      resize: vertical;
    }

    .reserve-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-top: 0.5rem;
      flex-wrap: wrap;
    }

    .reserve-error {
      color: var(--danger);
      font-size: 0.8125rem;
    }

    .owner-decisions {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .reserve-heading {
      font-size: 0.875rem;
      font-weight: 800;
      margin: 0;
    }

    .decision-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem;
      background: var(--bg-soft, #f9fafb);
      border-radius: var(--radius);
    }

    .decision-avatar {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-full);
      object-fit: cover;
      flex-shrink: 0;
    }

    .decision-body {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }

    .decision-msg {
      font-size: 0.8125rem;
      color: var(--text-secondary);
      margin: 0.25rem 0;
    }

    .decision-time {
      font-size: 0.6875rem;
      color: var(--text-muted);
    }

    .decision-actions {
      display: flex;
      gap: 0.375rem;
    }

    .reservation-history {
      font-size: 0.8125rem;
    }

    .reservation-history summary {
      cursor: pointer;
      font-weight: 600;
    }

    .history-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.25rem 0;
    }

    .history-time {
      margin-left: auto;
      color: var(--text-muted);
      font-size: 0.75rem;
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
  @Output() approveEvent = new EventEmitter<string>();
  @Output() rejectEvent = new EventEmitter<string>();

  formatEventCategory(value: string): string {
    return value.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  postImages(): string[] {
    return getPostImageUrls(this.post);
  }

  previewImageUrl(): string {
    return this.postImages()[this.previewImageIndex()] ?? '';
  }

  authService = inject(AuthService);
  commentService = inject(CommentService);
  transactionService = inject(TransactionService);

  showComments = signal(false);
  showImagePreview = signal(false);
  previewImageIndex = signal(0);
  showReserveForm = signal(false);
  txBusy = signal(false);
  txError = signal<string | null>(null);
  reserveMessage = '';
  newComment = '';

  comments = computed(() => {
    const postId = this.post?.id;
    if (!postId) return [];
    return this.commentService.getCommentsByPost(postId);
  });

  commentCount = computed(() => {
    const postId = this.post?.id;
    if (!postId) return 0;
    return this.commentService.getCommentCount(postId);
  });

  isOwner = computed(() => this.authService.currentUser()?.id === this.post?.userId);

  postReservations = computed<Reservation[]>(() => {
    if (!this.post) return [];
    return this.transactionService.getReservationsForPost(this.post.id);
  });

  pendingReservations = computed(() =>
    this.postReservations().filter(r => r.status === 'pending')
  );

  decidedReservations = computed(() =>
    this.postReservations().filter(r => r.status !== 'pending')
  );

  myPendingReservation = computed<Reservation | undefined>(() => {
    const me = this.authService.currentUser();
    if (!me || !this.post) return undefined;
    return this.transactionService.getActiveReservationByUser(this.post.id, me.id);
  });

  hasMyReservation = computed(() => {
    const me = this.authService.currentUser();
    if (!me) return false;
    return this.postReservations().some(r => r.requesterId === me.id);
  });

  canRequestAdoption = computed(() => {
    const me = this.authService.currentUser();
    if (!me || !this.post) return false;
    if (this.post.type !== 'adoption') return false;
    if (this.post.userId === me.id) return false;
    if (this.post.resolved) return false;
    if (this.post.reservationStatus === 'adopted') return false;
    if (this.post.reservationStatus === 'reserved' && this.post.reservedBy !== me.id) return false;
    if (this.myPendingReservation()) return false;
    return true;
  });

  toggleComments(): void {
    this.showComments.update(v => !v);
  }

  submitComment(): void {
    const content = this.newComment.trim();
    if (!content) return;
    this.newComment = '';
    this.addComment.emit({ postId: this.post.id, content });
  }

  openImagePreview(index = 0): void {
    this.previewImageIndex.set(index);
    this.showImagePreview.set(true);
  }

  closeImagePreview(): void {
    this.showImagePreview.set(false);
  }

  prevPreviewImage(event: Event): void {
    event.stopPropagation();
    const total = this.postImages().length;
    if (total <= 1) return;
    this.previewImageIndex.update(i => (i - 1 + total) % total);
  }

  nextPreviewImage(event: Event): void {
    event.stopPropagation();
    const total = this.postImages().length;
    if (total <= 1) return;
    this.previewImageIndex.update(i => (i + 1) % total);
  }

  toggleReserveForm(): void {
    this.txError.set(null);
    this.showReserveForm.update(v => !v);
  }

  async submitReservation(): Promise<void> {
    if (!this.reserveMessage.trim() || this.txBusy()) return;
    this.txBusy.set(true);
    this.txError.set(null);
    const result = await this.transactionService.reserveForAdoption({
      postId: this.post.id,
      message: this.reserveMessage
    });
    this.txBusy.set(false);
    if (result.success) {
      this.reserveMessage = '';
      this.showReserveForm.set(false);
    } else {
      this.txError.set(result.error || 'Reservation failed.');
    }
  }

  async cancelMyReservation(): Promise<void> {
    const r = this.myPendingReservation();
    if (!r || this.txBusy()) return;
    this.txBusy.set(true);
    const result = await this.transactionService.cancelReservation(r.id);
    this.txBusy.set(false);
    if (!result.success) this.txError.set(result.error || 'Cancel failed.');
  }

  async approveReservation(reservationId: string): Promise<void> {
    if (this.txBusy()) return;
    this.txBusy.set(true);
    const result = await this.transactionService.approveReservation(reservationId);
    this.txBusy.set(false);
    if (!result.success) this.txError.set(result.error || 'Approve failed.');
  }

  async rejectReservation(reservationId: string): Promise<void> {
    if (this.txBusy()) return;
    this.txBusy.set(true);
    const result = await this.transactionService.rejectReservation(reservationId);
    this.txBusy.set(false);
    if (!result.success) this.txError.set(result.error || 'Reject failed.');
  }
}
