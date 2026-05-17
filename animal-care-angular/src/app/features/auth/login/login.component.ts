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
      <div class="auth-bg" aria-hidden="true">
        <div class="auth-blob auth-blob-1"></div>
        <div class="auth-blob auth-blob-2"></div>
        <div class="auth-blob auth-blob-3"></div>
        <span class="auth-paw auth-paw-1">🐾</span>
        <span class="auth-paw auth-paw-2">🐾</span>
        <span class="auth-paw auth-paw-3">🐾</span>
        <span class="auth-paw auth-paw-4">🐾</span>
      </div>

      <div class="auth-container">
        <div class="auth-header">
          <span class="auth-icon" aria-hidden="true">🐾</span>
          <h1>Welcome Back</h1>
          <p>Sign in to AnimalCare</p>
        </div>

        @if (error) {
          <div class="auth-error" role="alert">{{ error }}</div>
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
      position: relative;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      overflow: hidden;
      background: linear-gradient(
        -45deg,
        var(--bg-primary),
        var(--bg-secondary),
        #FDE68A,
        var(--bg-primary)
      );
      background-size: 400% 400%;
      animation: gradientShift 12s ease infinite;
    }

    .auth-bg {
      position: absolute;
      inset: 0;
      pointer-events: none;
      overflow: hidden;
    }

    .auth-blob {
      position: absolute;
      border-radius: 50%;
      filter: blur(60px);
      opacity: 0.55;
    }

    .auth-blob-1 {
      width: 320px;
      height: 320px;
      top: -80px;
      left: -60px;
      background: var(--primary-light);
      animation: blobFloat 18s ease-in-out infinite;
    }

    .auth-blob-2 {
      width: 280px;
      height: 280px;
      bottom: -40px;
      right: -40px;
      background: var(--secondary-light);
      animation: blobFloat 22s ease-in-out infinite reverse;
    }

    .auth-blob-3 {
      width: 200px;
      height: 200px;
      top: 40%;
      right: 15%;
      background: var(--accent-light);
      animation: blobFloat 15s ease-in-out infinite 2s;
    }

    .auth-paw {
      position: absolute;
      font-size: 2rem;
      opacity: 0.12;
      user-select: none;
    }

    .auth-paw-1 {
      top: 12%;
      left: 8%;
      animation: pawDrift 20s ease-in-out infinite;
    }

    .auth-paw-2 {
      top: 70%;
      left: 18%;
      font-size: 1.5rem;
      transform: rotate(-25deg);
      animation: pawDrift 24s ease-in-out infinite 3s;
    }

    .auth-paw-3 {
      top: 20%;
      right: 12%;
      font-size: 2.5rem;
      transform: rotate(15deg);
      animation: pawDrift 18s ease-in-out infinite 1s reverse;
    }

    .auth-paw-4 {
      bottom: 15%;
      right: 22%;
      font-size: 1.75rem;
      transform: rotate(40deg);
      animation: pawDrift 26s ease-in-out infinite 5s;
    }

    .auth-container {
      position: relative;
      z-index: 1;
      width: 100%;
      max-width: 420px;
      background: rgba(255, 255, 255, 0.92);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.8);
      border-radius: var(--radius-xl);
      padding: 2.5rem;
      box-shadow:
        0 20px 40px -12px rgba(217, 119, 6, 0.15),
        0 8px 16px -8px rgba(0, 0, 0, 0.08);
      animation: cardEnter 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
    }

    .auth-header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .auth-icon {
      font-size: 3rem;
      display: block;
      margin-bottom: 0.75rem;
      animation: iconPulse 3s ease-in-out infinite;
      filter: drop-shadow(0 4px 8px rgba(245, 158, 11, 0.35));
    }

    .auth-header h1 {
      font-size: 1.75rem;
      font-weight: 800;
      color: var(--text-primary);
      background: linear-gradient(135deg, var(--text-primary) 0%, var(--primary-dark) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
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
      animation: shake 0.4s ease;
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

    .auth-form .input-field {
      transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
    }

    .auth-form .input-field:focus {
      transform: translateY(-1px);
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
      transition: color 0.2s ease;
    }

    .auth-footer a:hover {
      color: var(--primary);
      text-decoration: underline;
    }

    @keyframes gradientShift {
      0%, 100% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
    }

    @keyframes blobFloat {
      0%, 100% { transform: translate(0, 0) scale(1); }
      33% { transform: translate(30px, -20px) scale(1.05); }
      66% { transform: translate(-20px, 15px) scale(0.95); }
    }

    @keyframes pawDrift {
      0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.1; }
      50% { transform: translateY(-24px) rotate(8deg); opacity: 0.18; }
    }

    @keyframes cardEnter {
      from {
        opacity: 0;
        transform: translateY(24px) scale(0.97);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @keyframes iconPulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.08); }
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      20%, 60% { transform: translateX(-4px); }
      40%, 80% { transform: translateX(4px); }
    }

    @media (prefers-reduced-motion: reduce) {
      .auth-page,
      .auth-blob,
      .auth-paw,
      .auth-container,
      .auth-icon {
        animation: none;
      }

      .auth-container {
        opacity: 1;
        transform: none;
      }
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

  async onSubmit(): Promise<void> {
    this.error = '';
    this.loading = true;

    try {
      const result = await this.authService.login(this.email, this.password);
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
    } finally {
      this.loading = false;
    }
  }
}
