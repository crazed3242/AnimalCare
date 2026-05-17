import type { Router } from '@angular/router';
import type { Post } from '../models/post.model';

/**
 * Opens the messages page for a post author with post context attached.
 */
export function navigateToMessageFromPost(router: Router, post: Post): void {
  void router.navigate(['/messages', post.userId], {
    queryParams: {
      postId: post.id,
      postTitle: post.description.slice(0, 80)
    }
  });
}
