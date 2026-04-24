import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="auth-container">
        <div class="auth-header">
          <span class="auth-icon">🐾</span>
          <h1>Welcome Back</h1>
          <p>Sign in to AnimalCare</p>
        </div>

        @if (error) {
          <div class="auth-error">{{ error }}</div>
        }

        <form class="auth-form" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="email">Email</label>
            <input id="email" type="email" class="input-field" [(ngModel)]="email" name="email" placeholder="Enter your email" required />
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input id="password" type="password" class="input-field" [(ngModel)]="password" name="password" placeholder="Enter your password" required />
          </div>

          <button type="submit" class="btn btn-primary btn-lg btn-block" [disabled]="loading">
            @if (loading) {
              Signing in...
            } @else {
              Sign In
            }
          </button>
        </form>

        <div class="auth-footer">
          <p>Don't have an account? <a routerLink="/register">Sign Up</a></p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
    }

    .auth-container {
      width: 100%;
      max-width: 420px;
      background: white;
      border-radius: var(--radius-xl);
      padding: 2.5rem;
      box-shadow: var(--shadow-lg);
    }

    .auth-header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .auth-icon {
      font-size: 3rem;
      display: block;
      margin-bottom: 0.75rem;
    }

    .auth-header h1 {
      font-size: 1.75rem;
      font-weight: 800;
      color: var(--text-primary);
    }

    .auth-header p {
      color: var(--text-muted);
      margin-top: 0.25rem;
    }

    .auth-error {
      background: #FEE2E2;
      color: #DC2626;
      padding: 0.75rem 1rem;
      border-radius: var(--radius);
      font-size: 0.875rem;
      font-weight: 600;
      margin-bottom: 1rem;
    }

    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .form-group label {
      font-size: 0.875rem;
      font-weight: 700;
      color: var(--text-secondary);
    }

    .auth-footer {
      text-align: center;
      margin-top: 1.5rem;
      font-size: 0.875rem;
      color: var(--text-muted);
    }

    .auth-footer a {
      color: var(--primary-dark);
      font-weight: 700;
    }

    .auth-footer a:hover {
      text-decoration: underline;
    }
  `]
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  error = '';
  loading = false;

  onSubmit(): void {
    this.error = '';
    this.loading = true;

    const result = this.authService.login(this.email, this.password);
    this.loading = false;

    if (result.success) {
      const user = this.authService.currentUser();
      if (user?.role === 'admin') {
        this.router.navigate(['/admin']);
      } else {
        this.router.navigate(['/feed']);
      }
    } else {
      this.error = result.error || 'Login failed';
    }
  }
}
