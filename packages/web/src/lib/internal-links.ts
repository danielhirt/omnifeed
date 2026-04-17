import { toInternalRoute } from '@omnifeed/core'
import { browser } from '$app/environment'

/**
 * Walk an HTML string and rewrite anchor tags whose href points to a known
 * source URL (HN /item, Lobsters /s/) into an internal Omnifeed route. The
 * router then handles the navigation as a SPA transition; the +layout's
 * external-link interceptor leaves relative hrefs alone.
 *
 * The original href is preserved as data-original-href in case we want to fall
 * back to the external site (e.g. on a load failure).
 *
 * Server-side rendering passes the HTML through unchanged — DOMParser is
 * browser-only, and comment/post bodies are populated client-side anyway.
 */
export function rewriteInternalLinks(html: string): string {
  if (!browser || !html) return html

  const doc = new DOMParser().parseFromString(html, 'text/html')
  const anchors = doc.querySelectorAll('a[href]')

  for (const a of Array.from(anchors)) {
    const href = a.getAttribute('href')
    if (!href) continue
    const internal = toInternalRoute(href)
    if (!internal) continue

    a.setAttribute('href', internal)
    a.setAttribute('data-original-href', href)
    // Open in the same tab; the +layout external-link handler only fires for
    // http(s) hrefs so relative hrefs route through SvelteKit naturally.
    a.removeAttribute('target')
    a.removeAttribute('rel')
  }

  return doc.body.innerHTML
}
