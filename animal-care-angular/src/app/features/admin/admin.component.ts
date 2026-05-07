import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { PostService } from '../../core/services/post.service';
import { CommentService } from '../../core/services/comment.service';
import { TransactionService } from '../../core/services/transaction.service';
import { Post, PostType } from '../../core/models/post.model';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [FormsModule, DatePipe, RouterLink],
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
          <button class="admin-nav-btn" [class.active]="activeTab() === 'reservations'" (click)="activeTab.set('reservations')">
            Reservations
          </button>
          <button class="admin-nav-btn" [class.active]="activeTab() === 'events'" (click)="activeTab.set('events')">
            Events
            @if (pendingEventCount() > 0) {
              <span class="nav-badge">{{ pendingEventCount() }}</span>
            }
          </button>
          <button class="admin-nav-btn" [class.active]="activeTab() === 'transactions'" (click)="activeTab.set('transactions')">
            Transactions
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
                <div class="stat-value">{{ eventCount() }}</div>
                <div class="stat-label">Events</div>
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
              <button class="btn btn-sm" [class.btn-primary]="postFilter() === 'event'" [class.btn-outline]="postFilter() !== 'event'" (click)="postFilter.set('event')">Event</button>
            </div>
            <div class="admin-posts-list">
              @for (post of filteredAdminPosts(); track post.id) {
                <div class="admin-event-card card">
                  <div class="admin-post-item admin-event-summary-row">
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
                        @if (post.type === 'event' && post.eventStatus === 'proposed') {
                          <span class="badge badge-event-proposed">Pending</span>
                        }
                        @if (post.type === 'event' && post.eventStatus === 'approved') {
                          <span class="badge badge-event-approved">Approved</span>
                        }
                        @if (post.type === 'event' && post.eventStatus === 'rejected') {
                          <span class="badge badge-event-rejected">Rejected</span>
                        }
                        @if (post.type === 'adoption' && post.reservationStatus === 'reserved') {
                          <span class="badge badge-status-pending">Reserved</span>
                        }
                        @if (post.type === 'adoption' && post.reservationStatus === 'adopted') {
                          <span class="badge badge-status-approved">Adopted</span>
                        }
                      </div>
                      <p class="admin-post-desc admin-event-title-line">
                        @if (post.type === 'event' && post.eventName) {
                          <strong>{{ post.eventName }}</strong>
                        } @else {
                          {{ post.description }}
                        }
                      </p>
                      <div class="admin-post-meta">
                        <span>{{ post.location }}</span>
                        <span>{{ post.userName }}</span>
                        <span>{{ post.createdAt | date:'short' }}</span>
                      </div>
                    </div>
                    <div class="admin-post-actions">
                      @if (!post.resolved) {
                        <button type="button" class="btn btn-secondary btn-sm" (click)="resolvePost(post.id)">Resolve</button>
                      }
                      <button type="button" class="btn btn-danger btn-sm" (click)="deletePost(post.id)">Delete</button>
                    </div>
                  </div>

                  <details class="event-proposal-details">
                    <summary class="event-proposal-summary">View full post details</summary>
                    <div class="event-proposal-body">
                      <div class="event-detail-grid">
                        <div class="event-detail-item">
                          <span class="event-detail-label">Type</span>
                          <span class="event-detail-value">{{ post.type }}</span>
                        </div>
                        <div class="event-detail-item">
                          <span class="event-detail-label">Status</span>
                          <span class="event-detail-value">
                            @if (post.type === 'event' && post.eventStatus) { {{ post.eventStatus }} }
                            @else if (post.resolved) { Resolved }
                            @else { Active }
                          </span>
                        </div>
                        <div class="event-detail-item">
                          <span class="event-detail-label">Location</span>
                          <span class="event-detail-value">{{ post.location }}</span>
                        </div>
                        <div class="event-detail-item">
                          <span class="event-detail-label">Date</span>
                          <span class="event-detail-value">{{ post.date | date:'mediumDate' }}</span>
                        </div>
                        @if (post.eventEndDate) {
                          <div class="event-detail-item">
                            <span class="event-detail-label">End date</span>
                            <span class="event-detail-value">{{ post.eventEndDate | date:'mediumDate' }}</span>
                          </div>
                        }
                        <div class="event-detail-item">
                          <span class="event-detail-label">Contact</span>
                          <span class="event-detail-value">{{ post.contactInfo }}</span>
                        </div>
                        @if (post.urgencyLevel) {
                          <div class="event-detail-item">
                            <span class="event-detail-label">Urgency</span>
                            <span class="event-detail-value">{{ post.urgencyLevel }}</span>
                          </div>
                        }
                        @if (post.breed) {
                          <div class="event-detail-item">
                            <span class="event-detail-label">Breed</span>
                            <span class="event-detail-value">{{ post.breed }}</span>
                          </div>
                        }
                        @if (post.age) {
                          <div class="event-detail-item">
                            <span class="event-detail-label">Age</span>
                            <span class="event-detail-value">{{ post.age }}</span>
                          </div>
                        }
                        @if (post.healthCondition) {
                          <div class="event-detail-item event-detail-wide">
                            <span class="event-detail-label">Health condition</span>
                            <span class="event-detail-value">{{ post.healthCondition }}</span>
                          </div>
                        }
                        @if (post.adoptionRequirements) {
                          <div class="event-detail-item event-detail-wide">
                            <span class="event-detail-label">Adoption requirements</span>
                            <span class="event-detail-value">{{ post.adoptionRequirements }}</span>
                          </div>
                        }
                        @if (post.type === 'event' && post.eventCategory) {
                          <div class="event-detail-item">
                            <span class="event-detail-label">Event category</span>
                            <span class="event-detail-value">{{ formatEventCategory(post.eventCategory) }}</span>
                          </div>
                        }
                        @if (post.organizerName) {
                          <div class="event-detail-item">
                            <span class="event-detail-label">Organizer</span>
                            <span class="event-detail-value">{{ post.organizerName }}</span>
                          </div>
                        }
                        @if (post.expectedAttendees) {
                          <div class="event-detail-item">
                            <span class="event-detail-label">Expected attendees</span>
                            <span class="event-detail-value">{{ post.expectedAttendees }}</span>
                          </div>
                        }
                        <div class="event-detail-item">
                          <span class="event-detail-label">Posted by</span>
                          <span class="event-detail-value">
                            <a [routerLink]="['/profile', post.userId]" class="event-profile-link">{{ post.userName }}</a>
                          </span>
                        </div>
                        <div class="event-detail-item">
                          <span class="event-detail-label">Created</span>
                          <span class="event-detail-value">{{ post.createdAt | date:'medium' }}</span>
                        </div>
                        <div class="event-detail-item">
                          <span class="event-detail-label">Last updated</span>
                          <span class="event-detail-value">{{ post.updatedAt | date:'medium' }}</span>
                        </div>
                        <div class="event-detail-item event-detail-wide">
                          <span class="event-detail-label">Post ID</span>
                          <span class="event-detail-value event-detail-mono">{{ post.id }}</span>
                        </div>
                      </div>
                      <div class="event-description-block">
                        <span class="event-detail-label">Full description</span>
                        <p class="event-description-text">{{ post.description }}</p>
                      </div>
                      @if (post.imageUrl) {
                        <div class="event-image-preview">
                          <span class="event-detail-label">Attached image</span>
                          <a [href]="post.imageUrl" target="_blank" rel="noopener noreferrer" class="event-image-link">
                            <img [src]="post.imageUrl" [alt]="post.description" />
                          </a>
                        </div>
                      }
                    </div>
                  </details>
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
                <div class="admin-event-card card">
                  <div class="admin-user-item admin-event-summary-row">
                    <div class="admin-user-avatar">
                      <img [src]="user.avatarUrl" [alt]="user.name" />
                    </div>
                    <div class="admin-user-content">
                      <strong>{{ user.name }}</strong>
                      <span class="admin-user-email">{{ user.email }}</span>
                      <span class="admin-user-meta">{{ user.postCount }} posts · Joined {{ user.createdAt | date:'mediumDate' }}</span>
                    </div>
                    <a [routerLink]="['/profile', user.id]" class="btn btn-outline btn-sm">View profile</a>
                  </div>

                  <details class="event-proposal-details">
                    <summary class="event-proposal-summary">View full member details</summary>
                    <div class="event-proposal-body">
                      <div class="event-detail-grid">
                        <div class="event-detail-item">
                          <span class="event-detail-label">Display name</span>
                          <span class="event-detail-value">{{ user.name }}</span>
                        </div>
                        <div class="event-detail-item">
                          <span class="event-detail-label">Email</span>
                          <span class="event-detail-value">{{ user.email }}</span>
                        </div>
                        <div class="event-detail-item">
                          <span class="event-detail-label">Role</span>
                          <span class="event-detail-value">{{ user.role }}</span>
                        </div>
                        <div class="event-detail-item">
                          <span class="event-detail-label">Joined</span>
                          <span class="event-detail-value">{{ user.createdAt | date:'medium' }}</span>
                        </div>
                        <div class="event-detail-item">
                          <span class="event-detail-label">Member for</span>
                          <span class="event-detail-value">{{ memberForLabel(user.createdAt) }}</span>
                        </div>
                        <div class="event-detail-item">
                          <span class="event-detail-label">Total posts</span>
                          <span class="event-detail-value">{{ user.postCount }}</span>
                        </div>
                        <div class="event-detail-item">
                          <span class="event-detail-label">Comments written</span>
                          <span class="event-detail-value">{{ userCommentCount(user.id) }}</span>
                        </div>
                        <div class="event-detail-item">
                          <span class="event-detail-label">Reservations made</span>
                          <span class="event-detail-value">{{ userReservationCount(user.id) }}</span>
                        </div>
                        <div class="event-detail-item event-detail-wide">
                          <span class="event-detail-label">User ID</span>
                          <span class="event-detail-value event-detail-mono">{{ user.id }}</span>
                        </div>
                      </div>

                      <div class="event-description-block">
                        <span class="event-detail-label">Posts by type</span>
                        <div class="user-type-breakdown">
                          <span class="badge badge-lost">Lost {{ userPostCountByType(user.id, 'lost') }}</span>
                          <span class="badge badge-found">Found {{ userPostCountByType(user.id, 'found') }}</span>
                          <span class="badge badge-rescue">Rescue {{ userPostCountByType(user.id, 'rescue') }}</span>
                          <span class="badge badge-adoption">Adoption {{ userPostCountByType(user.id, 'adoption') }}</span>
                          <span class="badge badge-event">Events {{ userPostCountByType(user.id, 'event') }}</span>
                        </div>
                      </div>

                      @if (userRecentPosts(user.id).length > 0) {
                        <div class="event-description-block">
                          <span class="event-detail-label">Recent posts</span>
                          <ul class="user-recent-posts">
                            @for (p of userRecentPosts(user.id); track p.id) {
                              <li>
                                <span class="badge badge-{{ p.type }}">{{ p.type }}</span>
                                <span class="user-recent-desc">{{ p.type === 'event' && p.eventName ? p.eventName : p.description }}</span>
                                <span class="user-recent-time">{{ p.createdAt | date:'short' }}</span>
                              </li>
                            }
                          </ul>
                        </div>
                      }
                    </div>
                  </details>
                </div>
              } @empty {
                <p class="no-data">No users registered yet</p>
              }
            </div>
          </div>
        }

        @if (activeTab() === 'reservations') {
          <div class="reservations-section">
            <h1>Adoption Reservations</h1>
            <p class="section-hint">Each row corresponds to a Firestore <code>runTransaction()</code> call. Status changes are atomic with the linked post update.</p>
            <div class="admin-filters">
              <button class="btn btn-sm" [class.btn-primary]="reservationFilter() === 'all'" [class.btn-outline]="reservationFilter() !== 'all'" (click)="reservationFilter.set('all')">All</button>
              <button class="btn btn-sm" [class.btn-primary]="reservationFilter() === 'pending'" [class.btn-outline]="reservationFilter() !== 'pending'" (click)="reservationFilter.set('pending')">Pending</button>
              <button class="btn btn-sm" [class.btn-primary]="reservationFilter() === 'approved'" [class.btn-outline]="reservationFilter() !== 'approved'" (click)="reservationFilter.set('approved')">Approved</button>
              <button class="btn btn-sm" [class.btn-primary]="reservationFilter() === 'rejected'" [class.btn-outline]="reservationFilter() !== 'rejected'" (click)="reservationFilter.set('rejected')">Rejected</button>
              <button class="btn btn-sm" [class.btn-primary]="reservationFilter() === 'cancelled'" [class.btn-outline]="reservationFilter() !== 'cancelled'" (click)="reservationFilter.set('cancelled')">Cancelled</button>
            </div>
            <div class="admin-reservations-list">
              @for (r of filteredReservations(); track r.id) {
                <div class="admin-reservation-item card">
                  <div class="reservation-status">
                    <span class="badge badge-status-{{ r.status }}">{{ r.status }}</span>
                  </div>
                  <div class="reservation-body">
                    <div class="reservation-line">
                      <strong>{{ r.requesterName }}</strong>
                      <span class="muted">→</span>
                      <strong>{{ r.postOwnerName }}</strong>
                    </div>
                    <p class="reservation-msg">"{{ r.message }}"</p>
                    <span class="reservation-meta">Post: {{ r.postDescription }}</span>
                    <span class="reservation-meta">Created {{ r.createdAt | date:'short' }}@if (r.decidedAt) { <span> · Decided {{ r.decidedAt | date:'short' }}</span> }</span>
                  </div>
                </div>
              } @empty {
                <p class="no-data">No reservations match this filter</p>
              }
            </div>
          </div>
        }

        @if (activeTab() === 'events') {
          <div class="events-section">
            <h1>Event Proposals</h1>
            <p class="section-hint">Community-submitted events awaiting moderation. Approving an event marks it as official; rejecting it hides it from the public feed.</p>
            <div class="admin-filters">
              <button class="btn btn-sm" [class.btn-primary]="eventFilter() === 'proposed'" [class.btn-outline]="eventFilter() !== 'proposed'" (click)="eventFilter.set('proposed')">Pending ({{ pendingEventCount() }})</button>
              <button class="btn btn-sm" [class.btn-primary]="eventFilter() === 'approved'" [class.btn-outline]="eventFilter() !== 'approved'" (click)="eventFilter.set('approved')">Approved</button>
              <button class="btn btn-sm" [class.btn-primary]="eventFilter() === 'rejected'" [class.btn-outline]="eventFilter() !== 'rejected'" (click)="eventFilter.set('rejected')">Rejected</button>
              <button class="btn btn-sm" [class.btn-primary]="eventFilter() === 'all'" [class.btn-outline]="eventFilter() !== 'all'" (click)="eventFilter.set('all')">All</button>
            </div>
            <div class="admin-posts-list">
              @for (post of filteredEvents(); track post.id) {
                <div class="admin-event-card card">
                  <div class="admin-post-item admin-event-summary-row">
                    @if (post.imageUrl) {
                      <div class="admin-post-image">
                        <img [src]="post.imageUrl" [alt]="post.eventName || post.description" />
                      </div>
                    }
                    <div class="admin-post-content">
                      <div class="admin-post-header">
                        <span class="badge badge-event">event</span>
                        @if (post.eventCategory) {
                          <span class="badge badge-event-cat">{{ formatEventCategory(post.eventCategory) }}</span>
                        }
                        @if (post.eventStatus === 'proposed') {
                          <span class="badge badge-event-proposed">Pending</span>
                        } @else if (post.eventStatus === 'approved') {
                          <span class="badge badge-event-approved">Approved</span>
                        } @else if (post.eventStatus === 'rejected') {
                          <span class="badge badge-event-rejected">Rejected</span>
                        }
                      </div>
                      <p class="admin-post-desc admin-event-title-line"><strong>{{ post.eventName }}</strong></p>
                      <div class="admin-post-meta">
                        <span>{{ post.location }}</span>
                        <span>{{ post.date | date:'mediumDate' }}@if (post.eventEndDate) { → {{ post.eventEndDate | date:'mediumDate' }} }</span>
                        <span>{{ post.organizerName || post.userName }}</span>
                      </div>
                    </div>
                    <div class="admin-post-actions">
                      @if (post.eventStatus === 'proposed') {
                        <button type="button" class="btn btn-secondary btn-sm" (click)="approveEvent(post.id)">Approve</button>
                        <button type="button" class="btn btn-danger btn-sm" (click)="rejectEvent(post.id)">Reject</button>
                      } @else if (post.eventStatus === 'rejected') {
                        <button type="button" class="btn btn-secondary btn-sm" (click)="approveEvent(post.id)">Re-approve</button>
                      } @else if (post.eventStatus === 'approved') {
                        <button type="button" class="btn btn-outline btn-sm" (click)="rejectEvent(post.id)">Revoke</button>
                      }
                      <button type="button" class="btn btn-danger btn-sm" (click)="deletePost(post.id)">Delete</button>
                    </div>
                  </div>

                  <details class="event-proposal-details" [attr.open]="post.eventStatus === 'proposed' ? '' : null">
                    <summary class="event-proposal-summary">View full proposal details</summary>
                    <div class="event-proposal-body">
                      <div class="event-detail-grid">
                        <div class="event-detail-item">
                          <span class="event-detail-label">Category</span>
                          <span class="event-detail-value">{{ post.eventCategory ? formatEventCategory(post.eventCategory) : '—' }}</span>
                        </div>
                        <div class="event-detail-item">
                          <span class="event-detail-label">Venue</span>
                          <span class="event-detail-value">{{ post.location }}</span>
                        </div>
                        <div class="event-detail-item">
                          <span class="event-detail-label">Starts</span>
                          <span class="event-detail-value">{{ post.date | date:'mediumDate' }}</span>
                        </div>
                        <div class="event-detail-item">
                          <span class="event-detail-label">Ends</span>
                          <span class="event-detail-value">{{ post.eventEndDate ? (post.eventEndDate | date:'mediumDate') : '—' }}</span>
                        </div>
                        <div class="event-detail-item">
                          <span class="event-detail-label">Contact</span>
                          <span class="event-detail-value">{{ post.contactInfo }}</span>
                        </div>
                        <div class="event-detail-item">
                          <span class="event-detail-label">Expected attendees</span>
                          <span class="event-detail-value">{{ post.expectedAttendees || '—' }}</span>
                        </div>
                        <div class="event-detail-item">
                          <span class="event-detail-label">Organizer (listed)</span>
                          <span class="event-detail-value">{{ post.organizerName || '—' }}</span>
                        </div>
                        <div class="event-detail-item">
                          <span class="event-detail-label">Submitted by (account)</span>
                          <span class="event-detail-value">
                            <a [routerLink]="['/profile', post.userId]" class="event-profile-link">{{ post.userName }}</a>
                          </span>
                        </div>
                        <div class="event-detail-item">
                          <span class="event-detail-label">Submitted</span>
                          <span class="event-detail-value">{{ post.createdAt | date:'medium' }}</span>
                        </div>
                        <div class="event-detail-item">
                          <span class="event-detail-label">Last updated</span>
                          <span class="event-detail-value">{{ post.updatedAt | date:'medium' }}</span>
                        </div>
                        <div class="event-detail-item event-detail-wide">
                          <span class="event-detail-label">Post ID</span>
                          <span class="event-detail-value event-detail-mono">{{ post.id }}</span>
                        </div>
                      </div>
                      @if (post.eventDecidedBy) {
                        <p class="event-moderation-note">
                          Moderation: {{ post.eventStatus === 'approved' ? 'Approved' : 'Rejected' }} by {{ post.eventDecidedBy }}
                          @if (post.eventDecidedAt) { on {{ post.eventDecidedAt | date:'medium' }} }
                        </p>
                      }
                      <div class="event-description-block">
                        <span class="event-detail-label">Full description</span>
                        <p class="event-description-text">{{ post.description }}</p>
                      </div>
                      @if (post.imageUrl) {
                        <div class="event-image-preview">
                          <span class="event-detail-label">Attached image</span>
                          <a [href]="post.imageUrl" target="_blank" rel="noopener noreferrer" class="event-image-link">
                            <img [src]="post.imageUrl" [alt]="post.eventName || 'Event image'" />
                          </a>
                        </div>
                      }
                    </div>
                  </details>
                </div>
              } @empty {
                <p class="no-data">No events match this filter</p>
              }
            </div>
          </div>
        }

        @if (activeTab() === 'transactions') {
          <div class="transactions-section">
            <h1>Transaction Log</h1>
            <p class="section-hint">
              Durable, append-only audit trail. Every <strong>runTransaction()</strong> and <strong>writeBatch()</strong> the app performs writes
              one row here, including <em>rolled-back</em> attempts. Once committed these rows cannot be modified or deleted (see <code>firestore.rules</code>).
            </p>
            <div class="tx-stats">
              <div class="tx-stat-card card">
                <div class="tx-stat-value">{{ committedCount() }}</div>
                <div class="tx-stat-label">Committed</div>
              </div>
              <div class="tx-stat-card card">
                <div class="tx-stat-value">{{ rolledBackCount() }}</div>
                <div class="tx-stat-label">Rolled back</div>
              </div>
              <div class="tx-stat-card card">
                <div class="tx-stat-value">{{ totalRetries() }}</div>
                <div class="tx-stat-label">Retries (isolation)</div>
              </div>
            </div>
            <div class="admin-filters">
              <button class="btn btn-sm" [class.btn-primary]="txOutcomeFilter() === 'all'" [class.btn-outline]="txOutcomeFilter() !== 'all'" (click)="txOutcomeFilter.set('all')">All</button>
              <button class="btn btn-sm" [class.btn-primary]="txOutcomeFilter() === 'COMMITTED'" [class.btn-outline]="txOutcomeFilter() !== 'COMMITTED'" (click)="txOutcomeFilter.set('COMMITTED')">Committed</button>
              <button class="btn btn-sm" [class.btn-primary]="txOutcomeFilter() === 'ROLLED_BACK'" [class.btn-outline]="txOutcomeFilter() !== 'ROLLED_BACK'" (click)="txOutcomeFilter.set('ROLLED_BACK')">Rolled back</button>
            </div>
            <div class="tx-table card">
              <div class="tx-row tx-head">
                <span>When</span>
                <span>Type</span>
                <span>Outcome</span>
                <span>Actor</span>
                <span>Details</span>
              </div>
              @for (log of filteredLogs(); track log.id) {
                <div class="tx-row">
                  <span class="tx-when">{{ log.createdAt | date:'short' }}</span>
                  <span class="tx-type">{{ log.type }}</span>
                  <span>
                    <span class="badge badge-tx-{{ log.outcome }}">{{ log.outcome }}</span>
                    @if ((log.retryCount || 0) > 0) {
                      <span class="tx-retry" title="Optimistic concurrency retries">↺{{ log.retryCount }}</span>
                    }
                  </span>
                  <span>{{ log.actorName }}</span>
                  <span class="tx-details">
                    {{ log.message }}
                    @if (log.errorReason) {
                      <em class="tx-error">— {{ log.errorReason }}</em>
                    }
                  </span>
                </div>
              } @empty {
                <p class="no-data">No transactions yet — try registering a user or reserving an adoption.</p>
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

    .admin-user-item.admin-event-summary-row .admin-user-content {
      flex: 1;
      min-width: 0;
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

    .section-hint {
      color: var(--text-muted);
      font-size: 0.875rem;
      margin: -0.75rem 0 1rem;
    }

    .section-hint code {
      background: rgba(0,0,0,0.05);
      padding: 0.1rem 0.35rem;
      border-radius: 4px;
      font-family: ui-monospace, monospace;
      font-size: 0.8125rem;
    }

    .admin-reservations-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .admin-reservation-item {
      display: grid;
      grid-template-columns: 110px 1fr;
      gap: 1rem;
      padding: 0.875rem 1rem;
      align-items: start;
    }

    .reservation-body {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      min-width: 0;
    }

    .reservation-line {
      font-size: 0.875rem;
    }

    .reservation-msg {
      font-size: 0.8125rem;
      color: var(--text-secondary);
      font-style: italic;
    }

    .reservation-meta {
      font-size: 0.6875rem;
      color: var(--text-muted);
    }

    .badge-status-pending { background: rgba(245, 158, 11, 0.15); color: #b45309; }
    .badge-status-approved { background: rgba(16, 185, 129, 0.15); color: #047857; }
    .badge-status-rejected { background: rgba(239, 68, 68, 0.15); color: #b91c1c; }
    .badge-status-cancelled { background: rgba(107, 114, 128, 0.15); color: #374151; }

    .badge-event-cat { background: #EDE9FE; color: #5B21B6; }
    .badge-event-proposed { background: rgba(245, 158, 11, 0.18); color: #b45309; }
    .badge-event-approved { background: rgba(16, 185, 129, 0.18); color: #047857; }
    .badge-event-rejected { background: rgba(239, 68, 68, 0.18); color: #b91c1c; }

    .nav-badge {
      margin-left: auto;
      background: var(--danger);
      color: white;
      font-size: 0.6875rem;
      font-weight: 700;
      padding: 0.125rem 0.5rem;
      border-radius: var(--radius-full);
      min-width: 20px;
      text-align: center;
    }

    .admin-event-card {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      padding: 0;
      overflow: hidden;
    }

    .admin-event-title-line {
      display: block;
      -webkit-line-clamp: unset;
      -webkit-box-orient: unset;
      overflow: visible;
      margin-bottom: 0.375rem;
    }

    .event-proposal-details {
      border-top: 1px solid var(--border);
      background: var(--bg-soft, #fafafa);
    }

    .event-proposal-summary {
      list-style: none;
      cursor: pointer;
      padding: 0.75rem 1rem;
      font-size: 0.8125rem;
      font-weight: 700;
      color: var(--primary-dark);
      user-select: none;
    }

    .event-proposal-summary::-webkit-details-marker {
      display: none;
    }

    .event-proposal-summary::before {
      content: '▸';
      display: inline-block;
      margin-right: 0.5rem;
      transition: transform 0.15s ease;
    }

    details[open] > .event-proposal-summary::before {
      transform: rotate(90deg);
    }

    .event-proposal-body {
      padding: 0 1rem 1rem;
    }

    .event-detail-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 0.75rem 1.25rem;
      margin-bottom: 1rem;
    }

    .event-detail-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      font-size: 0.8125rem;
    }

    .event-detail-wide {
      grid-column: 1 / -1;
    }

    .event-detail-label {
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-muted);
    }

    .event-detail-value {
      color: var(--text-primary);
      font-weight: 600;
      word-break: break-word;
    }

    .event-detail-mono {
      font-family: ui-monospace, monospace;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .event-profile-link {
      color: var(--primary-dark);
      font-weight: 700;
      text-decoration: underline;
      text-underline-offset: 2px;
    }

    .event-profile-link:hover {
      color: var(--primary);
    }

    .event-moderation-note {
      font-size: 0.8125rem;
      color: var(--text-secondary);
      padding: 0.5rem 0.75rem;
      background: white;
      border-radius: var(--radius);
      border-left: 3px solid var(--primary);
      margin-bottom: 1rem;
    }

    .event-description-block {
      margin-bottom: 1rem;
    }

    .event-description-text {
      margin-top: 0.375rem;
      font-size: 0.875rem;
      line-height: 1.55;
      color: var(--text-primary);
      white-space: pre-wrap;
      word-break: break-word;
      padding: 0.75rem 1rem;
      background: white;
      border-radius: var(--radius);
      border: 1px solid var(--border);
    }

    .event-image-preview {
      margin-top: 0.5rem;
    }

    .event-image-preview img {
      margin-top: 0.375rem;
      max-width: min(100%, 480px);
      max-height: 320px;
      object-fit: contain;
      border-radius: var(--radius);
      border: 1px solid var(--border);
    }

    .event-image-link {
      display: inline-block;
    }

    .user-type-breakdown {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
      margin-top: 0.375rem;
      padding: 0.625rem 0.75rem;
      background: white;
      border-radius: var(--radius);
      border: 1px solid var(--border);
    }

    .user-recent-posts {
      list-style: none;
      margin-top: 0.375rem;
      padding: 0.5rem 0.75rem;
      background: white;
      border-radius: var(--radius);
      border: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .user-recent-posts li {
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: center;
      gap: 0.625rem;
      font-size: 0.8125rem;
    }

    .user-recent-desc {
      color: var(--text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .user-recent-time {
      color: var(--text-muted);
      font-size: 0.6875rem;
    }

    .tx-stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .tx-stat-card {
      padding: 1rem;
      text-align: center;
    }

    .tx-stat-value {
      font-size: 1.75rem;
      font-weight: 800;
      color: var(--primary-dark);
    }

    .tx-stat-label {
      font-size: 0.75rem;
      color: var(--text-muted);
      font-weight: 600;
    }

    .tx-table {
      padding: 0;
      overflow: hidden;
    }

    .tx-row {
      display: grid;
      grid-template-columns: 130px 170px 160px 130px 1fr;
      gap: 0.75rem;
      padding: 0.625rem 0.875rem;
      font-size: 0.8125rem;
      border-bottom: 1px solid var(--border);
      align-items: center;
    }

    .tx-row:last-child {
      border-bottom: none;
    }

    .tx-head {
      background: var(--bg-soft, #f9fafb);
      font-weight: 700;
      font-size: 0.75rem;
      text-transform: uppercase;
      color: var(--text-muted);
    }

    .tx-when {
      color: var(--text-muted);
    }

    .tx-type {
      font-family: ui-monospace, monospace;
      font-size: 0.75rem;
      color: var(--primary-dark);
      font-weight: 600;
    }

    .badge-tx-COMMITTED { background: rgba(16, 185, 129, 0.15); color: #047857; }
    .badge-tx-ROLLED_BACK { background: rgba(239, 68, 68, 0.15); color: #b91c1c; }

    .tx-retry {
      margin-left: 0.25rem;
      font-size: 0.6875rem;
      color: var(--text-muted);
    }

    .tx-details {
      font-size: 0.8125rem;
      color: var(--text-secondary);
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .tx-error {
      color: var(--danger);
      font-style: italic;
    }

    .muted {
      color: var(--text-muted);
    }

    @media (max-width: 768px) {
      .tx-row {
        grid-template-columns: 1fr;
      }
      .tx-head { display: none; }
      .tx-stats { grid-template-columns: 1fr; }
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
  transactionService = inject(TransactionService);
  private router = inject(Router);

  activeTab = signal<'overview' | 'posts' | 'comments' | 'users' | 'reservations' | 'events' | 'transactions'>('overview');
  postFilter = signal<string>('all');
  reservationFilter = signal<string>('all');
  txOutcomeFilter = signal<'all' | 'COMMITTED' | 'ROLLED_BACK'>('all');
  eventFilter = signal<'all' | 'proposed' | 'approved' | 'rejected'>('proposed');

  totalPosts = computed(() => this.postService.posts().length);
  lostCount = computed(() => this.postService.posts().filter(p => p.type === 'lost').length);
  foundCount = computed(() => this.postService.posts().filter(p => p.type === 'found').length);
  rescueCount = computed(() => this.postService.posts().filter(p => p.type === 'rescue').length);
  adoptionCount = computed(() => this.postService.posts().filter(p => p.type === 'adoption').length);
  eventCount = computed(() => this.postService.posts().filter(p => p.type === 'event').length);
  pendingEventCount = computed(() =>
    this.postService.posts().filter(p => p.type === 'event' && p.eventStatus === 'proposed').length
  );
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

  filteredEvents = computed(() => {
    const f = this.eventFilter();
    const events = this.postService.posts().filter(p => p.type === 'event');
    const filtered = f === 'all' ? events : events.filter(p => p.eventStatus === f);
    return [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  });

  filteredReservations = computed(() => {
    const f = this.reservationFilter();
    const all = [...this.transactionService.reservations()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return f === 'all' ? all : all.filter(r => r.status === f);
  });

  filteredLogs = computed(() => {
    const f = this.txOutcomeFilter();
    const logs = this.transactionService.logs();
    return f === 'all' ? logs : logs.filter(l => l.outcome === f);
  });

  committedCount = computed(() =>
    this.transactionService.logs().filter(l => l.outcome === 'COMMITTED').length
  );

  rolledBackCount = computed(() =>
    this.transactionService.logs().filter(l => l.outcome === 'ROLLED_BACK').length
  );

  totalRetries = computed(() =>
    this.transactionService.logs().reduce((sum, l) => sum + (l.retryCount || 0), 0)
  );

  getPostDescription(postId: string): string {
    const post = this.postService.getPostById(postId);
    return post ? post.description.substring(0, 50) + (post.description.length > 50 ? '...' : '') : 'Deleted post';
  }

  formatEventCategory(value: string): string {
    return value.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  userCommentCount(userId: string): number {
    return this.commentService.comments().filter(c => c.userId === userId).length;
  }

  userReservationCount(userId: string): number {
    return this.transactionService.reservations().filter(r => r.requesterId === userId).length;
  }

  userPostCountByType(userId: string, type: PostType): number {
    return this.postService.posts().filter(p => p.userId === userId && p.type === type).length;
  }

  userRecentPosts(userId: string): Post[] {
    return [...this.postService.posts()]
      .filter(p => p.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }

  memberForLabel(createdAt: string): string {
    const start = new Date(createdAt).getTime();
    if (Number.isNaN(start)) return '—';
    const days = Math.max(0, Math.floor((Date.now() - start) / (1000 * 60 * 60 * 24)));
    if (days < 1) return 'Less than a day';
    if (days === 1) return '1 day';
    if (days < 30) return `${days} days`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} month${months === 1 ? '' : 's'}`;
    const years = Math.floor(months / 12);
    const remMonths = months % 12;
    return remMonths === 0 ? `${years} year${years === 1 ? '' : 's'}` : `${years}y ${remMonths}m`;
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

  approveEvent(postId: string): void {
    if (confirm('Approve this proposed event?')) {
      this.postService.decideEvent(postId, 'approved');
    }
  }

  rejectEvent(postId: string): void {
    if (confirm('Reject this event proposal? It will be hidden from non-admin users.')) {
      this.postService.decideEvent(postId, 'rejected');
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
