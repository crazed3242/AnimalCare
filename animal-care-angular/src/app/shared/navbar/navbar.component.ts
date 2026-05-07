import { Component, inject, signal, computed } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { MessageService } from '../../core/services/message.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="navbar">
      <div class="navbar-inner">
        <a routerLink="/feed" class="navbar-brand">
          <span class="brand-icon">🐾</span>
          <span class="brand-text">AnimalCare</span>
        </a>

        <div class="navbar-links" [class.open]="menuOpen()">
          <a routerLink="/feed" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" (click)="menuOpen.set(false)">Feed</a>
          <a routerLink="/lost-found" routerLinkActive="active" (click)="menuOpen.set(false)">Lost & Found</a>
          <a routerLink="/rescue" routerLinkActive="active" (click)="menuOpen.set(false)">Rescue</a>
          <a routerLink="/adoption" routerLinkActive="active" (click)="menuOpen.set(false)">Adoption</a>
          <a routerLink="/events" routerLinkActive="active" (click)="menuOpen.set(false)">Events</a>
          <a routerLink="/messages" routerLinkActive="active" (click)="menuOpen.set(false)" class="messages-link">
            Messages
            @if (unreadCount() > 0) {
              <span class="unread-badge">{{ unreadCount() }}</span>
            }
          </a>
        </div>

        <div class="navbar-actions">
          <a routerLink="/profile" class="navbar-avatar" [title]="authService.currentUser()?.name || ''">
            <img [src]="authService.currentUser()?.avatarUrl" [alt]="authService.currentUser()?.name" />
          </a>
          <button class="btn btn-ghost btn-sm" (click)="logout()">Logout</button>
          <button class="menu-toggle" (click)="menuOpen.set(!menuOpen())">
            <span [class.open]="menuOpen()">☰</span>
          </button>
        </div>
      </div>
    </nav>
  `,
  styles: [`
    .navbar {
      background: white;
      border-bottom: 2px solid var(--border);
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: var(--shadow-sm);
    }

    .navbar-inner {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 1rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 64px;
    }

    .navbar-brand {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 800;
      font-size: 1.25rem;
      color: var(--primary-dark);
    }

    .brand-icon {
      font-size: 1.5rem;
    }

    .brand-text {
      color: var(--primary-dark);
    }

    .navbar-links {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .navbar-links a {
      padding: 0.5rem 0.875rem;
      border-radius: var(--radius);
      font-weight: 600;
      font-size: 0.875rem;
      color: var(--text-secondary);
      transition: var(--transition);
      position: relative;
    }

    .navbar-links a:hover {
      background: var(--bg-secondary);
      color: var(--primary-dark);
    }

    .navbar-links a.active {
      background: var(--bg-secondary);
      color: var(--primary-dark);
    }

    .messages-link {
      display: flex;
      align-items: center;
      gap: 0.375rem;
    }

    .unread-badge {
      background: var(--danger);
      color: white;
      font-size: 0.6875rem;
      font-weight: 700;
      padding: 0.125rem 0.375rem;
      border-radius: var(--radius-full);
      min-width: 18px;
      text-align: center;
      line-height: 1.3;
    }

    .navbar-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .navbar-avatar {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-full);
      overflow: hidden;
      border: 2px solid var(--primary-light);
      transition: var(--transition);
    }

    .navbar-avatar:hover {
      border-color: var(--primary);
    }

    .navbar-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .menu-toggle {
      display: none;
      background: none;
      font-size: 1.5rem;
      color: var(--text-secondary);
      padding: 0.25rem;
    }

    @media (max-width: 768px) {
      .navbar-links {
        display: none;
        position: absolute;
        top: 64px;
        left: 0;
        right: 0;
        background: white;
        flex-direction: column;
        padding: 1rem;
        border-bottom: 2px solid var(--border);
        box-shadow: var(--shadow-md);
      }

      .navbar-links.open {
        display: flex;
      }

      .menu-toggle {
        display: block;
      }
    }
  `]
})
export class NavbarComponent {
  authService = inject(AuthService);
  private messageService = inject(MessageService);
  private router = inject(Router);
  menuOpen = signal(false);
  unreadCount = computed(() => this.messageService.getTotalUnreadCount());

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
