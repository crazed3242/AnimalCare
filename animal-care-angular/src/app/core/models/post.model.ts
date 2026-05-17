export type PostType = 'lost' | 'found' | 'rescue' | 'adoption' | 'event';
export type UrgencyLevel = 'low' | 'medium' | 'high';
export type ReservationStatus = 'available' | 'reserved' | 'adopted';
export type EventCategory =
  | 'dog-show'
  | 'pet-show'
  | 'fundraiser'
  | 'workshop'
  | 'adoption-drive'
  | 'vaccination-drive'
  | 'other';
export type EventStatus = 'proposed' | 'approved' | 'rejected';

/** Maximum number of images that can be attached to a single post. */
export const MAX_POST_IMAGES = 10;

/**
 * Returns all image URLs for a post, including legacy single-image posts.
 */
export function getPostImageUrls(post: Pick<Post, 'imageUrl' | 'imageUrls'>): string[] {
  if (post.imageUrls?.length) return post.imageUrls;
  if (post.imageUrl) return [post.imageUrl];
  return [];
}

export interface Post {
  id: string;
  type: PostType;
  userId: string;
  userName: string;
  userAvatarUrl: string;
  /** @deprecated Use imageUrls. Kept for posts created before multi-image support. */
  imageUrl?: string;
  imageUrls?: string[];
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
  reservationStatus?: ReservationStatus;
  reservedBy?: string;
  reservedByName?: string;
  reservedAt?: string;
  reservationId?: string;
  eventName?: string;
  eventCategory?: EventCategory;
  eventEndDate?: string;
  organizerName?: string;
  expectedAttendees?: string;
  eventStatus?: EventStatus;
  eventDecidedBy?: string;
  eventDecidedAt?: string;
  createdAt: string;
  updatedAt: string;
  version?: number;
}

export interface CreatePostRequest {
  type: PostType;
  imageUrls?: string[];
  description: string;
  location: string;
  date: string;
  contactInfo: string;
  urgencyLevel?: UrgencyLevel;
  breed?: string;
  age?: string;
  healthCondition?: string;
  adoptionRequirements?: string;
  eventName?: string;
  eventCategory?: EventCategory;
  eventEndDate?: string;
  organizerName?: string;
  expectedAttendees?: string;
}
