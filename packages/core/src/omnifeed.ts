import type { ContentSource, FeedItem } from './models.js'

export type OmnifeedMode = 'newest' | 'hottest'

export type FeedView = ContentSource | 'omnifeed'

export const OMNIFEED_MAP: Record<OmnifeedMode, Record<ContentSource, string>> = {
  newest: { hackernews: 'new', lobsters: 'newest', devto: 'latest' },
  hottest: { hackernews: 'top', lobsters: 'hottest', devto: 'top' },
}

export function mergeFeeds(
  feedsBySource: Partial<Record<ContentSource, FeedItem[]>>
): FeedItem[] {
  return (Object.values(feedsBySource) as FeedItem[][])
    .flat()
    .sort((a, b) => b.timestamp - a.timestamp)
}
