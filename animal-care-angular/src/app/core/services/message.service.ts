import { Injectable, signal } from '@angular/core';
import { Message, Conversation } from '../models/message.model';
import { AuthService } from './auth.service';
import { storageGet, storageSet } from '../utils/storage';

const MESSAGES_KEY = 'animal_care_messages';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

@Injectable({ providedIn: 'root' })
export class MessageService {
  private messagesSignal = signal<Message[]>([]);
  readonly messages = this.messagesSignal.asReadonly();

  constructor(private authService: AuthService) {
    this.loadMessages();
  }

  private loadMessages(): void {
    const stored = storageGet(MESSAGES_KEY);
    if (stored) {
      try {
        this.messagesSignal.set(JSON.parse(stored));
      } catch {
        this.messagesSignal.set([]);
      }
    }
  }

  private saveMessages(messages: Message[]): void {
    storageSet(MESSAGES_KEY, JSON.stringify(messages));
    this.messagesSignal.set(messages);
  }

  getConversations(): Conversation[] {
    const user = this.authService.currentUser();
    if (!user) return [];

    const messages = this.messagesSignal();
    const conversationMap = new Map<string, Conversation>();

    const myMessages = messages
      .filter(m => m.senderId === user.id || m.receiverId === user.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    for (const msg of myMessages) {
      const otherUserId = msg.senderId === user.id ? msg.receiverId : msg.senderId;
      const key = [user.id, otherUserId].sort().join('-') + (msg.postId ? `-${msg.postId}` : '');

      if (!conversationMap.has(key)) {
        const isSender = msg.senderId === user.id;
        conversationMap.set(key, {
          id: key,
          otherUserId,
          otherUserName: isSender ? msg.receiverName : msg.senderName,
          otherUserAvatarUrl: isSender ? msg.receiverAvatarUrl : msg.senderAvatarUrl,
          lastMessage: msg.content,
          lastMessageTime: msg.createdAt,
          unreadCount: isSender ? 0 : (msg.read ? 0 : 1),
          postId: msg.postId,
          postTitle: msg.postTitle
        });
      } else {
        const conv = conversationMap.get(key)!;
        if (!msg.read && msg.receiverId === user.id) {
          conv.unreadCount++;
        }
      }
    }

    return Array.from(conversationMap.values()).sort(
      (a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    );
  }

  getConversationMessages(otherUserId: string, postId?: string): Message[] {
    const user = this.authService.currentUser();
    if (!user) return [];

    return this.messagesSignal()
      .filter(m => {
        const isPartOfConversation = (m.senderId === user.id && m.receiverId === otherUserId) ||
          (m.senderId === otherUserId && m.receiverId === user.id);
        if (postId) {
          return isPartOfConversation && m.postId === postId;
        }
        return isPartOfConversation;
      })
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  sendMessage(receiverId: string, content: string, postId?: string, postTitle?: string): { success: boolean; error?: string } {
    const user = this.authService.currentUser();
    if (!user) return { success: false, error: 'Not logged in' };
    if (!content.trim()) return { success: false, error: 'Message cannot be empty' };

    const receiverProfile = this.authService.getUserProfile(receiverId);
    if (!receiverProfile) return { success: false, error: 'Receiver not found' };

    const message: Message = {
      id: generateId(),
      senderId: user.id,
      senderName: user.name,
      senderAvatarUrl: user.avatarUrl,
      receiverId,
      receiverName: receiverProfile.name,
      receiverAvatarUrl: receiverProfile.avatarUrl,
      content: content.trim(),
      postId,
      postTitle,
      createdAt: new Date().toISOString(),
      read: false
    };

    const messages = [...this.messagesSignal(), message];
    this.saveMessages(messages);
    return { success: true };
  }

  markAsRead(otherUserId: string): void {
    const user = this.authService.currentUser();
    if (!user) return;

    const messages = this.messagesSignal().map(m => {
      if (m.senderId === otherUserId && m.receiverId === user.id && !m.read) {
        return { ...m, read: true };
      }
      return m;
    });

    this.saveMessages(messages);
  }

  getTotalUnreadCount(): number {
    const user = this.authService.currentUser();
    if (!user) return 0;
    return this.messagesSignal().filter(m => m.receiverId === user.id && !m.read).length;
  }
}
