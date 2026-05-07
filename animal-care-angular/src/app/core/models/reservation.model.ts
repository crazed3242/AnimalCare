export type ReservationState = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface Reservation {
  id: string;
  postId: string;
  postOwnerId: string;
  postOwnerName: string;
  postDescription: string;
  requesterId: string;
  requesterName: string;
  requesterAvatarUrl: string;
  message: string;
  status: ReservationState;
  createdAt: string;
  decidedAt?: string;
  decidedBy?: string;
  decisionNote?: string;
}

export interface CreateReservationRequest {
  postId: string;
  message: string;
}
