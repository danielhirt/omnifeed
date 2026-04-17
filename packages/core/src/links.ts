/**
 * URL pattern detection for cross-source post links.
 *
 * When a comment or post body contains a link to another item on a supported
 * source (HN, Lobsters), we want to open it inside Omnifeed instead of bouncing
 * the user to the external site. This module owns the URL parsing; the actual
 * HTML rewriting lives in the web package (it needs DOMParser).
 *
 * Note on HN: `news.ycombinator.com/item?id=N` may point to either a story or
 * a comment — HN uses the same /item route for both. The web layer fetches the
 * item and walks up to the root story when needed; this function only converts
 * the URL.
 */

const HN_ITEM_RE = /^https?:\/\/news\.ycombinator\.com\/item\?(?:[^#]*&)?id=(\d+)/
const LOBSTERS_STORY_RE = /^https?:\/\/lobste\.rs\/s\/([a-z0-9]+)(?:\/|$|\?|#)/i

/**
 * Convert an external URL to an internal Omnifeed route, or null if the URL
 * doesn't match a supported pattern.
 *
 * Examples:
 *   https://news.ycombinator.com/item?id=12345 → /item/hn:12345
 *   https://lobste.rs/s/abc123 → /item/lo:abc123
 *   https://lobste.rs/s/abc123/some-slug → /item/lo:abc123
 *   https://example.com → null
 */
export function toInternalRoute(url: string): string | null {
  const hn = url.match(HN_ITEM_RE)
  if (hn) return `/item/hn:${hn[1]}`

  const lo = url.match(LOBSTERS_STORY_RE)
  if (lo) return `/item/lo:${lo[1]}`

  return null
}
