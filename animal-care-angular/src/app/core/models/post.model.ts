export type PostType = 'lost' | 'found' | 'rescue' | 'adoption';
export type UrgencyLevel = 'low' | 'medium' | 'high';

export interface Post {
  id: string;
  type: PostType;
  userId: string;
  userName: string;
  userAvatarUrl: string;
  imageUrl?: string;
  description: string;
  location: string;
  date: string;
  contactInfo: string;
  resolved: boolean;
  urgencyLevel?: UrgencyLevel;
  breed?: string;
  age?: string;
  healthCondition?: string;
  adoptionRequirements?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePostRequest {
  type: PostType;
  imageUrl?: string;
  description: string;
  location: string;
  date: string;
  contactInfo: string;
  urgencyLevel?: UrgencyLevel;
  breed?: string;
  age?: string;
  healthCondition?: string;
  adoptionRequirements?: string;
}
