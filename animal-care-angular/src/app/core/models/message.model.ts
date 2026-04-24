export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl: string;
  receiverId: string;
  receiverName: string;
  receiverAvatarUrl: string;
  content: string;
  postId?: string;
  postTitle?: string;
  createdAt: string;
  read: boolean;
}

export interface Conversation {
  id: string;
  otherUserId: string;
  otherUserName: string;
  otherUserAvatarUrl: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  postId?: string;
  postTitle?: string;
}
