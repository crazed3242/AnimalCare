import { Injectable, computed, effect, signal } from '@angular/core';
import {
  collection,
  doc,
  onSnapshot,
  query,
  setDoc,
  where,
  writeBatch
} from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';
import {
  Conversation,
  Message,
  MessageAttachment,
  formatMessagePreview
} from '../models/message.model';
import { AuthService } from './auth.service';
import { getDb } from '../firebase/firebase';

const MESSAGES_COLLECTION = 'messages';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

@Injectable({ providedIn: 'root' })
export class MessageService {
  private messagesSignal = signal<Message[]>([]);
  readonly messages = this.messagesSignal.asReadonly();
  private unsubscribe: Unsubscribe | null = null;

  constructor(private authService: AuthService) {
    effect(() => {
      const user = this.authService.currentUser();
      this.resubscribe(user?.id ?? null);
    });
  }

  private resubscribe(userId: string | null): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.messagesSignal.set([]);

    const db = getDb();
    if (!db || !userId) return;

    const q = query(
      collection(db, MESSAGES_COLLECTION),
      where('participants', 'array-contains', userId)
    );
    this.unsubscribe = onSnapshot(q, snapshot => {
      const messages = snapshot.docs.map(d => d.data() as Message);
      this.messagesSignal.set(messages);
    });
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
          lastMessage: formatMessagePreview(msg),
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

  sendMessage(
    receiverId: string,
    content: string,
    postId?: string,
    postTitle?: string,
    attachments?: MessageAttachment[]
  ): { success: boolean; error?: string } {
    const user = this.authService.currentUser();
    if (!user) return { success: false, error: 'Not logged in' };

    const trimmed = content.trim();
    const media = attachments?.length ? attachments : undefined;
    if (!trimmed && !media?.length) {
      return { success: false, error: 'Message cannot be empty' };
    }

    const receiverProfile = this.authService.getUserProfile(receiverId);
    if (!receiverProfile) return { success: false, error: 'Receiver not found' };

    const db = getDb();
    if (!db) return { success: false, error: 'Offline' };

    const message: Message = {
      id: generateId(),
      senderId: user.id,
      senderName: user.name,
      senderAvatarUrl: user.avatarUrl,
      receiverId,
      receiverName: receiverProfile.name,
      receiverAvatarUrl: receiverProfile.avatarUrl,
      content: trimmed,
      attachments: media,
      postId,
      postTitle,
      createdAt: new Date().toISOString(),
      read: false,
      participants: [user.id, receiverId]
    };

    setDoc(doc(db, MESSAGES_COLLECTION, message.id), sanitize(message)).catch(err => {
      console.error('[MessageService] sendMessage failed', err);
    });

    return { success: true };
  }

  /**
   * Atomically flip every unread message in a conversation to read.
   * Using writeBatch guarantees the receiver either sees ALL their inbox
   * marked read or NONE — never a half state.
   */
  markAsRead(otherUserId: string): void {
    const user = this.authService.currentUser();
    if (!user) return;

    const db = getDb();
    if (!db) return;

    const unread = this.messagesSignal().filter(
      m => m.senderId === otherUserId && m.receiverId === user.id && !m.read
    );

    if (unread.length === 0) return;

    const batch = writeBatch(db);
    unread.forEach(m => {
      batch.update(doc(db, MESSAGES_COLLECTION, m.id), { read: true });
    });
    batch.commit().catch(err => {
      console.error('[MessageService] markAsRead failed', err);
    });
  }

  getTotalUnreadCount(): number {
    const user = this.authService.currentUser();
    if (!user) return 0;
    return this.messagesSignal().filter(m => m.receiverId === user.id && !m.read).length;
  }
}

function sanitize<T extends Record<string, any>>(obj: T): T {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as T;
}
