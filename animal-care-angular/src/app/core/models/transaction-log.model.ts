export type TransactionType =
  | 'USER_REGISTER'
  | 'POST_CREATE'
  | 'POST_DELETE'
  | 'POST_RESOLVE'
  | 'RESERVATION_CREATE'
  | 'RESERVATION_CANCEL'
  | 'RESERVATION_APPROVE'
  | 'RESERVATION_REJECT';

export type TransactionOutcome = 'COMMITTED' | 'ROLLED_BACK';

export interface TransactionLog {
  id: string;
  type: TransactionType;
  outcome: TransactionOutcome;
  actorId: string;
  actorName: string;
  entities: { collection: string; docId: string }[];
  message: string;
  errorReason?: string;
  retryCount?: number;
  createdAt: string;
}
