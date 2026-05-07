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
  eventName?: string;
  eventCategory?: EventCategory;
  eventEndDate?: string;
  organizerName?: string;
  expectedAttendees?: string;
}
