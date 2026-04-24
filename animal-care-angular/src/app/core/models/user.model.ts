export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  avatarUrl: string;
  role: 'admin' | 'user';
  createdAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: 'admin' | 'user';
  createdAt: string;
  postCount: number;
}
