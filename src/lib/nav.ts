import { router } from 'expo-router';

/**
 * Safe navigation helper to prevent 'GO_BACK was not handled by any navigator'
 * errors when a user lands directly on a route or refreshes the page.
 *
 * @param fallback Route to navigate to if there is no previous history (default: '/')
 */
export function safeBack(fallback: string = '/') {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallback as any);
  }
}
