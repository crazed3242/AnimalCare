import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { PostService } from '../../core/services/post.service';
import { AuthService } from '../../core/services/auth.service';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { PostType, UrgencyLevel } from '../../core/models/post.model';

@Component({
  selector: 'app-create-post',
  standalone: true,
  imports: [FormsModule, NavbarComponent, RouterLink],
  template: `
    <app-navbar />

    <div class="create-page">
      <div class="create-container">
        <div class="create-header">
          <a routerLink="/feed" class="btn btn-ghost btn-sm">← Back to Feed</a>
          <h1>{{ pageTitle() }}</h1>
          <p>{{ pageDescription() }}</p>
        </div>

        @if (error()) {
          <div class="auth-error">{{ error() }}</div>
        }

        @if (success()) {
          <div class="success-msg">{{ success() }}</div>
        }

        <form class="create-form" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="imageFile">Pet Photo</label>
            <div class="file-upload" (click)="fileInput.click()">
              @if (imageUrl) {
                <div class="image-preview">
                  <img [src]="imageUrl" alt="Preview" />
                  <button type="button" class="remove-image" (click)="removeImage($event)">&times;</button>
                </div>
              } @else {
                <div class="upload-placeholder">
                  <span class="upload-icon">+</span>
                  <span>Click to upload a photo</span>
                </div>
              }
            </div>
            <input #fileInput type="file" id="imageFile" accept="image/*" class="file-input" (change)="onFileSelected($event)" />
          </div>

          <div class="form-group">
            <label for="description">Description *</label>
            <textarea id="description" class="input-field" [(ngModel)]="description" name="description" placeholder="Describe the pet, situation, or animal..." required></textarea>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="location">Location *</label>
              <input id="location" type="text" class="input-field" [(ngModel)]="location" name="location" placeholder="City, area, or address" required />
            </div>
            <div class="form-group">
              <label for="date">Date *</label>
              <input id="date" type="date" class="input-field" [(ngModel)]="date" name="date" required />
            </div>
          </div>

          <div class="form-group">
            <label for="contactInfo">Contact Info *</label>
            <input id="contactInfo" type="text" class="input-field" [(ngModel)]="contactInfo" name="contactInfo" placeholder="Phone number or email" required />
          </div>

          @if (postType() === 'rescue') {
            <div class="form-group">
              <label for="urgencyLevel">Urgency Level *</label>
              <select id="urgencyLevel" class="input-field" [(ngModel)]="urgencyLevel" name="urgencyLevel" required>
                <option value="" disabled>Select urgency level</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          }

          @if (postType() === 'adoption') {
            <div class="form-row">
              <div class="form-group">
                <label for="breed">Breed *</label>
                <input id="breed" type="text" class="input-field" [(ngModel)]="breed" name="breed" placeholder="e.g., Golden Retriever" />
              </div>
              <div class="form-group">
                <label for="age">Age *</label>
                <input id="age" type="text" class="input-field" [(ngModel)]="age" name="age" placeholder="e.g., 2 years" />
              </div>
            </div>
            <div class="form-group">
              <label for="healthCondition">Health Condition</label>
              <textarea id="healthCondition" class="input-field" [(ngModel)]="healthCondition" name="healthCondition" placeholder="Vaccination status, medical conditions..."></textarea>
            </div>
            <div class="form-group">
              <label for="adoptionRequirements">Adoption Requirements</label>
              <textarea id="adoptionRequirements" class="input-field" [(ngModel)]="adoptionRequirements" name="adoptionRequirements" placeholder="Home requirements, experience needed..."></textarea>
            </div>
          }

          <div class="form-actions">
            <button type="submit" class="btn btn-primary btn-lg" [disabled]="loading()">
              @if (loading()) {
                Posting...
              } @else {
                Create Post
              }
            </button>
            <a routerLink="/feed" class="btn btn-outline btn-lg">Cancel</a>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .create-page {
      max-width: 700px;
      margin: 0 auto;
      padding: 1.5rem 1rem;
    }

    .create-header {
      margin-bottom: 2rem;
    }

    .create-header h1 {
      font-size: 1.75rem;
      font-weight: 800;
      margin-top: 0.5rem;
    }

    .create-header p {
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

    .success-msg {
      background: #D1FAE5;
      color: #059669;
      padding: 0.75rem 1rem;
      border-radius: var(--radius);
      font-size: 0.875rem;
      font-weight: 600;
      margin-bottom: 1rem;
    }

    .create-form {
      background: white;
      padding: 1.5rem;
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow);
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

    .file-upload {
      border: 2px dashed var(--border);
      border-radius: var(--radius);
      cursor: pointer;
      transition: var(--transition);
      overflow: hidden;
    }

    .file-upload:hover {
      border-color: var(--primary);
      background: var(--bg-secondary);
    }

    .file-input {
      display: none;
    }

    .upload-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem 1rem;
      color: var(--text-muted);
      gap: 0.5rem;
    }

    .upload-icon {
      font-size: 2rem;
      font-weight: 300;
      color: var(--primary);
    }

    .image-preview {
      position: relative;
      max-height: 250px;
    }

    .image-preview img {
      width: 100%;
      max-height: 250px;
      object-fit: cover;
      display: block;
    }

    .remove-image {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      background: rgba(0,0,0,0.6);
      color: white;
      border: none;
      border-radius: var(--radius-full);
      width: 28px;
      height: 28px;
      font-size: 1rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: var(--transition);
    }

    .remove-image:hover {
      background: var(--danger);
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .form-actions {
      display: flex;
      gap: 0.75rem;
      margin-top: 0.5rem;
    }

    @media (max-width: 600px) {
      .form-row {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class CreatePostComponent {
  private postService = inject(PostService);
  authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  postType = computed(() => (this.route.snapshot.paramMap.get('type') || 'lost') as PostType);

  pageTitle = computed(() => {
    const titles: Record<PostType, string> = {
      lost: 'Report Lost Pet',
      found: 'Report Found Pet',
      rescue: 'Report Rescue Animal',
      adoption: 'Post Pet for Adoption'
    };
    return titles[this.postType()];
  });

  pageDescription = computed(() => {
    const descs: Record<PostType, string> = {
      lost: 'Help find your lost pet by providing details',
      found: 'Help reunite a found pet with its owner',
      rescue: 'Report an animal that needs urgent help',
      adoption: 'List a pet for adoption to find them a home'
    };
    return descs[this.postType()];
  });

  imageUrl = '';
  private selectedFile: File | null = null;
  description = '';
  location = '';
  date = new Date().toISOString().split('T')[0];
  contactInfo = '';
  urgencyLevel: UrgencyLevel | '' = '';
  breed = '';
  age = '';
  healthCondition = '';
  adoptionRequirements = '';

  error = signal('');
  success = signal('');
  loading = signal(false);

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      if (file.size > 5 * 1024 * 1024) {
        this.error.set('Image must be less than 5MB');
        return;
      }
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imageUrl = e.target?.result as string || '';
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage(event: Event): void {
    event.stopPropagation();
    this.imageUrl = '';
    this.selectedFile = null;
  }

  onSubmit(): void {
    this.error.set('');
    this.success.set('');
    this.loading.set(true);

    const result = this.postService.createPost({
      type: this.postType(),
      imageUrl: this.imageUrl || undefined,
      description: this.description,
      location: this.location,
      date: this.date,
      contactInfo: this.contactInfo,
      urgencyLevel: this.urgencyLevel || undefined,
      breed: this.breed || undefined,
      age: this.age || undefined,
      healthCondition: this.healthCondition || undefined,
      adoptionRequirements: this.adoptionRequirements || undefined
    });

    this.loading.set(false);

    if (result.success) {
      this.success.set('Post created successfully!');
      setTimeout(() => this.router.navigate(['/feed']), 1000);
    } else {
      this.error.set(result.error || 'Failed to create post');
    }
  }
}
