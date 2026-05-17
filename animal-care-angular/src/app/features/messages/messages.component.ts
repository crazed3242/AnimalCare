import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
  effect,
  untracked,
  ElementRef,
  viewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MessageService } from '../../core/services/message.service';
import { AuthService } from '../../core/services/auth.service';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { DatePipe } from '@angular/common';
import {
  Conversation,
  Message,
  MessageAttachment,
  MAX_MESSAGE_ATTACHMENTS,
  MAX_MESSAGE_IMAGE_BYTES,
  MAX_MESSAGE_VIDEO_BYTES
} from '../../core/models/message.model';

interface PendingAttachment {
  url: string;
  type: 'image' | 'video';
  name: string;
}

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [FormsModule, NavbarComponent, DatePipe],
  template: `
    <app-navbar />

    <div class="messages-page">
      <div
        class="messages-layout"
        [class.show-chat]="!!activeConversationId()"
      >
        <aside class="conversations-panel">
          <div class="panel-header">
            <h2>Messages</h2>
          </div>

          <div class="search-bar card">
            <input
              class="input-field"
              type="text"
              placeholder="Search by name, message, or post..."
              [value]="searchQuery()"
              (input)="onSearchInput($event)"
            />
          </div>

          <div class="conversations-list">
            @for (conv of conversations(); track conv.id) {
              <div
                class="conversation-item"
                [class.active]="activeConversationId() === conv.id"
                (click)="selectConversation(conv)"
              >
                <div class="conv-avatar">
                  <img [src]="conv.otherUserAvatarUrl" [alt]="conv.otherUserName" />
                  @if (conv.unreadCount > 0) {
                    <span class="conv-unread">{{ conv.unreadCount }}</span>
                  }
                </div>
                <div class="conv-info">
                  <span class="conv-name">{{ conv.otherUserName }}</span>
                  <span class="conv-last">{{ conv.lastMessage }}</span>
                  @if (conv.postTitle) {
                    <span class="conv-post">Re: {{ conv.postTitle }}</span>
                  }
                </div>
                <span class="conv-time">{{ conv.lastMessageTime | date:'shortDate' }}</span>
              </div>
            } @empty {
              <div class="no-conversations">
                <p>No conversations yet</p>
                <p class="hint">Message someone from a post!</p>
              </div>
            }
          </div>
        </aside>

        <main class="chat-panel">
          @if (activeConversation()) {
            <div class="chat-header">
              <button
                type="button"
                class="btn btn-ghost btn-sm chat-back"
                (click)="closeChat()"
                aria-label="Back to conversations"
              >
                ←
              </button>
              <div class="chat-user">
                <img [src]="activeConversation()!.otherUserAvatarUrl" [alt]="activeConversation()!.otherUserName" class="chat-avatar" />
                <div>
                  <h3>{{ activeConversation()!.otherUserName }}</h3>
                  @if (activeConversation()!.postTitle) {
                    <span class="chat-context">Re: {{ activeConversation()!.postTitle }}</span>
                  }
                </div>
              </div>
            </div>

            <div class="chat-messages" #scrollContainer>
              @for (msg of chatMessages(); track msg.id) {
                <div class="chat-bubble" [class.mine]="msg.senderId === authService.currentUser()?.id">
                  @if (msg.attachments?.length) {
                    <div class="bubble-attachments" [class.multi]="(msg.attachments?.length ?? 0) > 1">
                      @for (att of msg.attachments; track $index) {
                        @if (att.type === 'image') {
                          <a [href]="att.url" target="_blank" rel="noopener noreferrer" class="bubble-media">
                            <img [src]="att.url" alt="Shared photo" />
                          </a>
                        } @else {
                          <video class="bubble-media bubble-video" [src]="att.url" controls preload="metadata"></video>
                        }
                      }
                    </div>
                  }
                  @if (msg.content) {
                    <p class="bubble-text">{{ msg.content }}</p>
                  }
                  <span class="bubble-time">{{ msg.createdAt | date:'shortTime' }}</span>
                </div>
              } @empty {
                <div class="no-messages">
                  <p>No messages yet. Say hello!</p>
                </div>
              }
            </div>

            @if (sendError()) {
              <p class="chat-error" role="alert">{{ sendError() }}</p>
            }

            @if (pendingAttachments().length > 0) {
              <div class="attachment-preview-bar">
                @for (att of pendingAttachments(); track $index) {
                  <div class="attachment-preview">
                    @if (att.type === 'image') {
                      <img [src]="att.url" [alt]="att.name" />
                    } @else {
                      <video [src]="att.url" muted></video>
                      <span class="video-badge">Video</span>
                    }
                    <button
                      type="button"
                      class="remove-attachment"
                      (click)="removePendingAttachment($index)"
                      [attr.aria-label]="'Remove ' + att.name"
                    >
                      ×
                    </button>
                  </div>
                }
              </div>
            }

            <div class="chat-input">
              <input
                #fileInput
                type="file"
                class="file-input-hidden"
                accept="image/*,video/*"
                multiple
                (change)="onFilesSelected($event)"
              />
              <button
                type="button"
                class="btn btn-ghost btn-sm attach-btn"
                (click)="fileInput.click()"
                [disabled]="pendingAttachments().length >= maxAttachments"
                aria-label="Attach photos or videos"
                title="Attach photos or videos"
              >
                📎
              </button>
              <input
                type="text"
                class="input-field"
                placeholder="Type a message..."
                [(ngModel)]="newMessage"
                (keyup.enter)="sendMessage()"
              />
              <button
                class="btn btn-primary"
                (click)="sendMessage()"
                [disabled]="!canSend()"
              >
                Send
              </button>
            </div>
            <p class="attach-hint">Up to {{ maxAttachments }} photos or videos (images 5MB, videos 25MB). Select multiple at once.</p>
          } @else {
            <div class="no-chat">
              <span class="no-chat-icon">💬</span>
              <h3>Select a conversation</h3>
              <p>Choose a conversation from the left to start messaging</p>
            </div>
          }
        </main>
      </div>
    </div>
  `,
  styles: [`
    .messages-page {
      height: calc(100vh - 64px);
      overflow: hidden;
    }

    .messages-layout {
      display: grid;
      grid-template-columns: 320px 1fr;
      height: 100%;
      min-height: 0;
    }

    .conversations-panel {
      border-right: 2px solid var(--border);
      display: flex;
      flex-direction: column;
      background: white;
      min-height: 0;
      overflow: hidden;
    }

    .panel-header {
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }

    .panel-header h2 {
      font-size: 1.25rem;
      font-weight: 800;
    }

    .search-bar {
      padding: 0.75rem;
      margin: 0.75rem;
      margin-top: 0.5rem;
      flex-shrink: 0;
    }

    .conversations-list {
      flex: 1;
      overflow-y: auto;
      min-height: 0;
    }

    .conversation-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.875rem 1.25rem;
      cursor: pointer;
      transition: var(--transition);
      border-bottom: 1px solid var(--border);
    }

    .conversation-item:hover {
      background: var(--bg-secondary);
    }

    .conversation-item.active {
      background: var(--bg-secondary);
      border-left: 3px solid var(--primary);
    }

    .conv-avatar {
      position: relative;
      width: 42px;
      height: 42px;
      border-radius: var(--radius-full);
      overflow: hidden;
      flex-shrink: 0;
    }

    .conv-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .conv-unread {
      position: absolute;
      top: -4px;
      right: -4px;
      background: var(--danger);
      color: white;
      font-size: 0.625rem;
      font-weight: 700;
      padding: 0.125rem 0.3125rem;
      border-radius: var(--radius-full);
      min-width: 16px;
      text-align: center;
    }

    .conv-info {
      flex: 1;
      min-width: 0;
    }

    .conv-name {
      display: block;
      font-weight: 700;
      font-size: 0.875rem;
    }

    .conv-last {
      display: block;
      font-size: 0.75rem;
      color: var(--text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .conv-post {
      display: block;
      font-size: 0.6875rem;
      color: var(--primary-dark);
      font-weight: 600;
    }

    .conv-time {
      font-size: 0.6875rem;
      color: var(--text-muted);
      flex-shrink: 0;
    }

    .no-conversations {
      text-align: center;
      padding: 2rem 1rem;
      color: var(--text-muted);
    }

    .hint {
      font-size: 0.8125rem;
      margin-top: 0.25rem;
    }

    .chat-panel {
      display: flex;
      flex-direction: column;
      background: var(--bg-primary);
      min-height: 0;
      overflow: hidden;
    }

    .chat-header {
      padding: 0.875rem 1.25rem;
      background: white;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-shrink: 0;
    }

    .chat-back {
      display: none;
    }

    .chat-user {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .chat-avatar {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-full);
      object-fit: cover;
    }

    .chat-user h3 {
      font-size: 0.9375rem;
      font-weight: 700;
    }

    .chat-context {
      font-size: 0.75rem;
      color: var(--primary-dark);
    }

    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      min-height: 0;
    }

    .chat-bubble {
      max-width: 70%;
      padding: 0.625rem 0.875rem;
      border-radius: var(--radius-lg);
      background: white;
      box-shadow: var(--shadow-sm);
    }

    .chat-bubble.mine {
      align-self: flex-end;
      background: var(--primary);
      color: white;
    }

    .bubble-attachments {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      margin-bottom: 0.375rem;
    }

    .bubble-attachments.multi {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.25rem;
    }

    .bubble-media {
      display: block;
      max-width: 100%;
      border-radius: var(--radius);
      overflow: hidden;
    }

    .bubble-media img,
    .bubble-video {
      width: 100%;
      max-height: 220px;
      object-fit: cover;
      display: block;
    }

    .bubble-text {
      font-size: 0.875rem;
      line-height: 1.4;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .bubble-time {
      display: block;
      font-size: 0.625rem;
      margin-top: 0.25rem;
      opacity: 0.7;
    }

    .no-messages {
      text-align: center;
      color: var(--text-muted);
      padding: 2rem;
    }

    .chat-error {
      padding: 0.375rem 1.25rem;
      color: var(--danger);
      font-size: 0.8125rem;
      flex-shrink: 0;
    }

    .attachment-preview-bar {
      display: flex;
      gap: 0.5rem;
      padding: 0.5rem 1.25rem;
      background: white;
      border-top: 1px solid var(--border);
      overflow-x: auto;
      flex-shrink: 0;
    }

    .attachment-preview {
      position: relative;
      width: 64px;
      height: 64px;
      flex-shrink: 0;
      border-radius: var(--radius);
      overflow: hidden;
    }

    .attachment-preview img,
    .attachment-preview video {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .video-badge {
      position: absolute;
      bottom: 2px;
      left: 2px;
      font-size: 0.5625rem;
      background: rgba(0, 0, 0, 0.65);
      color: white;
      padding: 0.0625rem 0.25rem;
      border-radius: 2px;
    }

    .remove-attachment {
      position: absolute;
      top: 2px;
      right: 2px;
      width: 20px;
      height: 20px;
      border: none;
      border-radius: var(--radius-full);
      background: rgba(0, 0, 0, 0.6);
      color: white;
      font-size: 0.875rem;
      line-height: 1;
      cursor: pointer;
    }

    .chat-input {
      padding: 0.875rem 1.25rem;
      background: white;
      border-top: 1px solid var(--border);
      display: flex;
      gap: 0.5rem;
      align-items: center;
      flex-shrink: 0;
    }

    .chat-input input[type="text"] {
      flex: 1;
    }

    .attach-btn {
      flex-shrink: 0;
      font-size: 1.125rem;
      padding: 0.375rem 0.5rem;
    }

    .file-input-hidden {
      display: none;
    }

    .attach-hint {
      font-size: 0.6875rem;
      color: var(--text-muted);
      padding: 0 1.25rem 0.5rem;
      background: white;
      flex-shrink: 0;
    }

    .no-chat {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: var(--text-muted);
    }

    .no-chat-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .no-chat h3 {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text-secondary);
    }

    .no-chat p {
      margin-top: 0.25rem;
    }

    @media (max-width: 768px) {
      .messages-layout {
        grid-template-columns: 1fr;
      }

      .messages-layout.show-chat .conversations-panel {
        display: none;
      }

      .messages-layout:not(.show-chat) .chat-panel {
        display: none;
      }

      .chat-back {
        display: inline-flex;
      }
    }
  `]
})
export class MessagesComponent implements OnInit, OnDestroy {
  messageService = inject(MessageService);
  authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private routeSub?: Subscription;

  readonly maxAttachments = MAX_MESSAGE_ATTACHMENTS;
  scrollContainer = viewChild<ElementRef<HTMLElement>>('scrollContainer');

  searchQuery = signal('');
  conversations = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const all = this.messageService.getConversations();
    if (!q) return all;

    return all.filter(conv => {
      const text = [conv.otherUserName, conv.lastMessage, conv.postTitle]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return text.includes(q);
    });
  });

  activeConversationId = signal<string | null>(null);
  activeConversation = signal<Conversation | null>(null);
  chatMessages = signal<Message[]>([]);
  pendingAttachments = signal<PendingAttachment[]>([]);
  sendError = signal('');
  newMessage = '';

  constructor() {
    effect(() => {
      this.conversations();
      const active = this.activeConversation();
      const activeId = this.activeConversationId();
      if (!active || !activeId?.startsWith('new-')) return;

      const match = this.conversations().find(
        c => c.otherUserId === active.otherUserId &&
          (active.postId ? c.postId === active.postId : !c.postId)
      ) ?? this.conversations().find(c => c.otherUserId === active.otherUserId);

      if (match && match.id !== activeId) {
        untracked(() => this.selectConversation(match, false));
      }
    });

    effect(() => {
      const conv = this.activeConversation();
      if (!conv) return;
      this.messageService.messages();
      untracked(() => this.refreshChatMessages(conv));
    });

    effect(() => {
      const msgs = this.chatMessages();
      if (!msgs.length) return;
      untracked(() => {
        queueMicrotask(() => this.scrollToBottom());
      });
    });
  }

  ngOnInit(): void {
    this.routeSub = this.route.paramMap.subscribe(() => {
      const userId = this.route.snapshot.paramMap.get('userId');
      const postId = this.route.snapshot.queryParamMap.get('postId') ?? undefined;
      const postTitle = this.route.snapshot.queryParamMap.get('postTitle') ?? undefined;
      this.openConversationForUser(userId, postId, postTitle);
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.searchQuery.set(target?.value ?? '');
  }

  closeChat(): void {
    this.clearActiveConversation();
    void this.router.navigate(['/messages']);
  }

  selectConversation(conv: Conversation, markRead = true): void {
    this.sendError.set('');
    this.pendingAttachments.set([]);
    this.activeConversationId.set(conv.id);
    this.activeConversation.set(conv);
    this.refreshChatMessages(conv);
    if (markRead) {
      this.messageService.markAsRead(conv.otherUserId);
    }
  }

  canSend(): boolean {
    return !!this.newMessage.trim() || this.pendingAttachments().length > 0;
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    this.sendError.set('');
    const remaining = this.maxAttachments - this.pendingAttachments().length;
    if (remaining <= 0) {
      this.sendError.set(`You can attach up to ${this.maxAttachments} files per message`);
      input.value = '';
      return;
    }

    const files = Array.from(input.files).slice(0, remaining);
    let pending = [...this.pendingAttachments()];

    for (const file of files) {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      if (!isImage && !isVideo) {
        this.sendError.set('Only photos and videos are allowed');
        continue;
      }
      const maxBytes = isVideo ? MAX_MESSAGE_VIDEO_BYTES : MAX_MESSAGE_IMAGE_BYTES;
      if (file.size > maxBytes) {
        this.sendError.set(isVideo ? 'Each video must be under 25MB' : 'Each image must be under 5MB');
        continue;
      }

      const reader = new FileReader();
      reader.onload = e => {
        const url = e.target?.result as string;
        if (!url) return;
        if (pending.length >= this.maxAttachments) return;
        pending = [...pending, { url, type: isVideo ? 'video' : 'image', name: file.name }];
        this.pendingAttachments.set(pending);
      };
      reader.readAsDataURL(file);
    }

    input.value = '';
  }

  removePendingAttachment(index: number): void {
    this.pendingAttachments.update(list => list.filter((_, i) => i !== index));
  }

  sendMessage(): void {
    const conv = this.activeConversation();
    if (!conv || !this.canSend()) return;

    this.sendError.set('');
    const attachments: MessageAttachment[] = this.pendingAttachments().map(a => ({
      url: a.url,
      type: a.type
    }));

    const result = this.messageService.sendMessage(
      conv.otherUserId,
      this.newMessage,
      conv.postId,
      conv.postTitle,
      attachments.length ? attachments : undefined
    );

    if (result.success) {
      this.newMessage = '';
      this.pendingAttachments.set([]);
      this.refreshChatMessages(conv);
      this.scrollToBottom();
    } else {
      this.sendError.set(result.error || 'Failed to send message');
    }
  }

  private openConversationForUser(
    userId: string | null,
    postId?: string,
    postTitle?: string
  ): void {
    if (!userId) {
      if (!this.route.snapshot.paramMap.get('userId')) {
        this.clearActiveConversation();
      }
      return;
    }

    const match =
      this.conversations().find(
        c => c.otherUserId === userId && (postId ? c.postId === postId : !c.postId)
      ) ?? this.conversations().find(c => c.otherUserId === userId);

    if (match) {
      this.selectConversation(match);
      return;
    }

    const profile = this.authService.getUserProfile(userId);
    if (!profile) {
      this.sendError.set('User not found. Try again in a moment.');
      return;
    }

    const id = `new-${userId}-${postId ?? 'direct'}`;
    this.sendError.set('');
    this.pendingAttachments.set([]);
    this.activeConversationId.set(id);
    this.activeConversation.set({
      id,
      otherUserId: userId,
      otherUserName: profile.name,
      otherUserAvatarUrl: profile.avatarUrl,
      lastMessage: '',
      lastMessageTime: new Date().toISOString(),
      unreadCount: 0,
      postId,
      postTitle
    });
    this.chatMessages.set(this.messageService.getConversationMessages(userId, postId));
  }

  private refreshChatMessages(conv: Conversation): void {
    this.chatMessages.set(
      this.messageService.getConversationMessages(conv.otherUserId, conv.postId)
    );
  }

  private clearActiveConversation(): void {
    this.activeConversationId.set(null);
    this.activeConversation.set(null);
    this.chatMessages.set([]);
    this.pendingAttachments.set([]);
    this.sendError.set('');
    this.newMessage = '';
  }

  private scrollToBottom(): void {
    const el = this.scrollContainer()?.nativeElement;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }
}
