import { Routes } from '@angular/router';
import { adminGuard, userGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'feed'
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'feed',
    canActivate: [userGuard],
    loadComponent: () => import('./features/feed/feed.component').then(m => m.FeedComponent)
  },
  {
    path: 'lost-found',
    canActivate: [userGuard],
    loadComponent: () => import('./features/lost-found/lost-found.component').then(m => m.LostFoundComponent)
  },
  {
    path: 'rescue',
    canActivate: [userGuard],
    loadComponent: () => import('./features/rescue/rescue.component').then(m => m.RescueComponent)
  },
  {
    path: 'adoption',
    canActivate: [userGuard],
    loadComponent: () => import('./features/adoption/adoption.component').then(m => m.AdoptionComponent)
  },
  {
    path: 'create-post/:type',
    canActivate: [userGuard],
    loadComponent: () => import('./features/create-post/create-post.component').then(m => m.CreatePostComponent)
  },
  {
    path: 'messages',
    canActivate: [userGuard],
    loadComponent: () => import('./features/messages/messages.component').then(m => m.MessagesComponent)
  },
  {
    path: 'messages/:userId',
    canActivate: [userGuard],
    loadComponent: () => import('./features/messages/messages.component').then(m => m.MessagesComponent)
  },
  {
    path: 'profile',
    canActivate: [userGuard],
    loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent)
  },
  {
    path: 'profile/:id',
    canActivate: [userGuard],
    loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent)
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./features/admin/admin.component').then(m => m.AdminComponent)
  },
  {
    path: '**',
    redirectTo: 'feed'
  }
];
