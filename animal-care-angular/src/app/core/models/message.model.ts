export const MAX_MESSAGE_ATTACHMENTS = 5;
export const MAX_MESSAGE_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_MESSAGE_VIDEO_BYTES = 25 * 1024 * 1024;

export interface MessageAttachment {
  url: string;
  type: 'image' | 'video';
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl: string;
  receiverId: string;
  receiverName: string;
  receiverAvatarUrl: string;
  content: string;
  attachments?: MessageAttachment[];
  postId?: string;
  postTitle?: string;
  createdAt: string;
  read: boolean;
  participants: string[];
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

export function formatMessagePreview(msg: Pick<Message, 'content' | 'attachments'>): string {
  const text = msg.content?.trim();
  if (text) return text;

  const attachments = msg.attachments ?? [];
  if (attachments.length === 0) return '';

  const imageCount = attachments.filter(a => a.type === 'image').length;
  const videoCount = attachments.filter(a => a.type === 'video').length;

  if (imageCount && videoCount) {
    return `${attachments.length} attachments`;
  }
  if (videoCount > 1) return `${videoCount} videos`;
  if (videoCount === 1) return 'Video';
  if (imageCount > 1) return `${imageCount} photos`;
  return 'Photo';
}
