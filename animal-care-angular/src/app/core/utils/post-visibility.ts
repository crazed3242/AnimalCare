import type { Post } from '../models/post.model';

export interface PostViewerContext {
  viewerId?: string | null;
  isAdmin?: boolean;
}

/**
 * Whether a post should appear in public lists (feed, events page, profiles).
 * Proposed and rejected events are visible only to the author and admins;
 * approved events (and legacy events without a status) are public.
 */
export function isPostVisibleToViewer(post: Post, ctx: PostViewerContext): boolean {
  if (post.type !== 'event') {
    return true;
  }

  const status = post.eventStatus ?? 'approved';
  if (status === 'approved') {
    return true;
  }

  if (ctx.isAdmin) {
    return true;
  }

  return !!ctx.viewerId && ctx.viewerId === post.userId;
}
