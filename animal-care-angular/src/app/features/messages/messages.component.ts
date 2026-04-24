import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MessageService } from '../../core/services/message.service';
import { AuthService } from '../../core/services/auth.service';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [FormsModule, NavbarComponent, DatePipe],
  template: `
    <app-navbar />

    <div class="messages-page">
      <div class="messages-layout">
        <aside class="conversations-panel">
          <div class="panel-header">
            <h2>Messages</h2>
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
                  <p class="bubble-text">{{ msg.content }}</p>
                  <span class="bubble-time">{{ msg.createdAt | date:'shortTime' }}</span>
                </div>
              } @empty {
                <div class="no-messages">
                  <p>No messages yet. Say hello!</p>
                </div>
              }
            </div>

            <div class="chat-input">
              <input
                type="text"
                class="input-field"
                placeholder="Type a message..."
                [(ngModel)]="newMessage"
                (keyup.enter)="sendMessage()"
              />
              <button class="btn btn-primary" (click)="sendMessage()" [disabled]="!newMessage.trim()">Send</button>
            </div>
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
    }

    .conversations-panel {
      border-right: 2px solid var(--border);
      display: flex;
      flex-direction: column;
      background: white;
    }

    .panel-header {
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--border);
    }

    .panel-header h2 {
      font-size: 1.25rem;
      font-weight: 800;
    }

    .conversations-list {
      flex: 1;
      overflow-y: auto;
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
    }

    .chat-header {
      padding: 0.875rem 1.25rem;
      background: white;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
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

    .bubble-text {
      font-size: 0.875rem;
      line-height: 1.4;
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

    .chat-input {
      padding: 0.875rem 1.25rem;
      background: white;
      border-top: 1px solid var(--border);
      display: flex;
      gap: 0.5rem;
    }

    .chat-input input {
      flex: 1;
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

      .conversations-panel {
        display: none;
      }

      .conversations-panel:has(.conversation-item) {
        display: flex;
      }
    }
  `]
})
export class MessagesComponent implements OnInit {
  messageService = inject(MessageService);
  authService = inject(AuthService);
  private route = inject(ActivatedRoute);

  conversations = computed(() => this.messageService.getConversations());
  activeConversationId = signal<string | null>(null);
  activeConversation = signal<any>(null);
  chatMessages = signal<any[]>([]);
  newMessage = '';

  ngOnInit(): void {
    const userId = this.route.snapshot.paramMap.get('userId');
    if (userId) {
      const conv = this.conversations().find(c => c.otherUserId === userId);
      if (conv) {
        this.selectConversation(conv);
      } else {
        const profile = this.authService.getUserProfile(userId);
        if (profile) {
          this.activeConversationId.set(`new-${userId}`);
          this.activeConversation.set({
            id: `new-${userId}`,
            otherUserId: userId,
            otherUserName: profile.name,
            otherUserAvatarUrl: profile.avatarUrl,
            postTitle: null
          });
          this.chatMessages.set(this.messageService.getConversationMessages(userId));
        }
      }
    }
  }

  selectConversation(conv: any): void {
    this.activeConversationId.set(conv.id);
    this.activeConversation.set(conv);
    this.chatMessages.set(this.messageService.getConversationMessages(conv.otherUserId, conv.postId));
    this.messageService.markAsRead(conv.otherUserId);
  }

  sendMessage(): void {
    const conv = this.activeConversation();
    if (!conv || !this.newMessage.trim()) return;

    const result = this.messageService.sendMessage(
      conv.otherUserId,
      this.newMessage,
      conv.postId,
      conv.postTitle
    );

    if (result.success) {
      this.newMessage = '';
      this.chatMessages.set(this.messageService.getConversationMessages(conv.otherUserId, conv.postId));
    }
  }
}
