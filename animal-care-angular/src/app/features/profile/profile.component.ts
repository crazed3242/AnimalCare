import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { PostService } from '../../core/services/post.service';
import { CommentService } from '../../core/services/comment.service';
import { MessageService } from '../../core/services/message.service';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { PostCardComponent } from '../../shared/post-card/post-card.component';
import { Post } from '../../core/models/post.model';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule, NavbarComponent, RouterLink, PostCardComponent, DatePipe],
  template: `
    <app-navbar />

    <div class="profile-page">
      <div class="profile-layout">
        <aside class="profile-sidebar">
          <div class="profile-card card">
            <div class="profile-avatar-large">
              <img [src]="profile()?.avatarUrl" [alt]="profile()?.name" />
            </div>
            <h2 class="profile-name">{{ profile()?.name }}</h2>
            <p class="profile-email">{{ profile()?.email }}</p>
            <p class="profile-joined">Joined {{ profile()?.createdAt | date:'mediumDate' }}</p>
            <div class="profile-stats">
              <div class="stat">
                <span class="stat-number">{{ profile()?.postCount }}</span>
                <span class="stat-label">Posts</span>
              </div>
            </div>

            @if (isOwnProfile()) {
              <div class="profile-edit">
                @if (editing()) {
                  <div class="edit-form">
                    <input type="text" class="input-field" [(ngModel)]="editName" placeholder="Your name" />
                    <div class="edit-actions">
                      <button class="btn btn-primary btn-sm" (click)="saveProfile()">Save</button>
                      <button class="btn btn-outline btn-sm" (click)="editing.set(false)">Cancel</button>
                    </div>
                  </div>
                } @else {
                  <button class="btn btn-outline btn-sm btn-block" (click)="startEdit()">Edit Profile</button>
                }
              </div>
            }

            @if (!isOwnProfile() && authService.isUser()) {
              <a [routerLink]="['/messages', profile()?.id]" class="btn btn-primary btn-sm btn-block" style="margin-top: 0.75rem;">Message</a>
            }
          </div>
        </aside>

        <main class="profile-main">
          <h3>Posts by {{ profile()?.name }}</h3>
          @for (post of userPosts(); track post.id) {
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
              <p>This user hasn't made any posts.</p>
            </div>
          }
        </main>
      </div>
    </div>
  `,
  styles: [`
    .profile-page {
      max-width: 1000px;
      margin: 0 auto;
      padding: 1.5rem 1rem;
    }

    .profile-layout {
      display: grid;
      grid-template-columns: 280px 1fr;
      gap: 1.5rem;
      align-items: start;
    }

    .profile-card {
      padding: 1.5rem;
      text-align: center;
    }

    .profile-avatar-large {
      width: 100px;
      height: 100px;
      border-radius: var(--radius-full);
      overflow: hidden;
      margin: 0 auto 1rem;
      border: 3px solid var(--primary-light);
    }

    .profile-avatar-large img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .profile-name {
      font-size: 1.25rem;
      font-weight: 800;
    }

    .profile-email {
      font-size: 0.8125rem;
      color: var(--text-muted);
      margin-top: 0.25rem;
    }

    .profile-joined {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: 0.25rem;
    }

    .profile-stats {
      display: flex;
      justify-content: center;
      gap: 1.5rem;
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border);
    }

    .stat {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .stat-number {
      font-size: 1.25rem;
      font-weight: 800;
      color: var(--primary-dark);
    }

    .stat-label {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .profile-edit {
      margin-top: 1rem;
    }

    .edit-form {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .edit-actions {
      display: flex;
      gap: 0.5rem;
    }

    .profile-main h3 {
      font-size: 1.125rem;
      font-weight: 800;
      margin-bottom: 1rem;
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

    @media (max-width: 768px) {
      .profile-layout {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ProfileComponent implements OnInit {
  authService = inject(AuthService);
  postService = inject(PostService);
  commentService = inject(CommentService);
  messageService = inject(MessageService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  profile = signal<any>(null);
  isOwnProfile = signal(false);
  editing = signal(false);
  editName = '';

  userPosts = computed(() => {
    const p = this.profile();
    if (!p) return [];
    return this.postService.posts()
      .filter(post => post.userId === p.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  });

  ngOnInit(): void {
    const userId = this.route.snapshot.paramMap.get('id') || this.authService.currentUser()?.id;
    if (userId) {
      const profile = this.authService.getUserProfile(userId);
      if (profile) {
        this.profile.set(profile);
        this.isOwnProfile.set(userId === this.authService.currentUser()?.id);
      }
    }
  }

  startEdit(): void {
    this.editName = this.profile()?.name || '';
    this.editing.set(true);
  }

  saveProfile(): void {
    if (!this.editName.trim()) return;
    const result = this.authService.updateProfile({ name: this.editName });
    if (result.success) {
      this.editing.set(false);
      const userId = this.authService.currentUser()?.id;
      if (userId) {
        this.profile.set(this.authService.getUserProfile(userId));
      }
    }
  }

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
