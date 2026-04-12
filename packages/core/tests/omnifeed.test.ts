import { describe, it, expect } from 'vitest'
import { mergeFeeds, OMNIFEED_MAP, type OmnifeedMode, type FeedView } from '../src/omnifeed.js'
import type { FeedItem, ContentSource } from '../src/models.js'
import { SOURCES, FEED_ENDPOINTS } from '../src/models.js'

function makeFeedItem(overrides: Partial<FeedItem> & { timestamp: number; source: ContentSource }): FeedItem {
  return {
    id: `${overrides.source === 'hackernews' ? 'hn' : overrides.source === 'lobsters' ? 'lo' : 'dev'}:${Math.random().toString(36).slice(2, 8)}`,
    title: 'Test item',
    score: 10,
    author: 'testuser',
    commentCount: 5,
    sourceUrl: 'https://example.com',
    ...overrides,
  }
}

describe('mergeFeeds', () => {
  it('sorts items from multiple sources by timestamp descending', () => {
    const items = mergeFeeds({
      hackernews: [makeFeedItem({ source: 'hackernews', timestamp: 100 })],
      lobsters: [makeFeedItem({ source: 'lobsters', timestamp: 300 })],
      devto: [makeFeedItem({ source: 'devto', timestamp: 200 })],
    })
    expect(items.map(i => i.timestamp)).toEqual([300, 200, 100])
    expect(items.map(i => i.source)).toEqual(['lobsters', 'devto', 'hackernews'])
  })

  it('handles empty sources', () => {
    const items = mergeFeeds({
      hackernews: [],
      lobsters: [makeFeedItem({ source: 'lobsters', timestamp: 100 })],
      devto: [],
    })
    expect(items).toHaveLength(1)
    expect(items[0].source).toBe('lobsters')
  })

  it('handles partial source map (missing sources)', () => {
    const items = mergeFeeds({
      hackernews: [makeFeedItem({ source: 'hackernews', timestamp: 100 })],
    })
    expect(items).toHaveLength(1)
  })

  it('handles empty input', () => {
    const items = mergeFeeds({})
    expect(items).toEqual([])
  })

  it('does not mutate input arrays', () => {
    const hn = [makeFeedItem({ source: 'hackernews', timestamp: 100 })]
    const lo = [makeFeedItem({ source: 'lobsters', timestamp: 200 })]
    const hnCopy = [...hn]
    const loCopy = [...lo]
    mergeFeeds({ hackernews: hn, lobsters: lo })
    expect(hn).toEqual(hnCopy)
    expect(lo).toEqual(loCopy)
  })

  it('interleaves items from same source correctly', () => {
    const items = mergeFeeds({
      hackernews: [
        makeFeedItem({ source: 'hackernews', timestamp: 300 }),
        makeFeedItem({ source: 'hackernews', timestamp: 100 }),
      ],
      lobsters: [
        makeFeedItem({ source: 'lobsters', timestamp: 200 }),
      ],
    })
    expect(items.map(i => i.timestamp)).toEqual([300, 200, 100])
  })
})

describe('OMNIFEED_MAP', () => {
  const modes: OmnifeedMode[] = ['newest', 'hottest']

  it('maps every mode to all three sources', () => {
    for (const mode of modes) {
      expect(OMNIFEED_MAP[mode]).toHaveProperty('hackernews')
      expect(OMNIFEED_MAP[mode]).toHaveProperty('lobsters')
      expect(OMNIFEED_MAP[mode]).toHaveProperty('devto')
    }
  })

  it('maps to valid HN feed IDs', () => {
    for (const mode of modes) {
      const feedId = OMNIFEED_MAP[mode].hackernews
      expect(FEED_ENDPOINTS).toHaveProperty(feedId)
    }
  })

  it('maps to valid Lobsters feed IDs', () => {
    const validLobsters = SOURCES.find(s => s.id === 'lobsters')!.feeds.map(f => f.id)
    for (const mode of modes) {
      expect(validLobsters).toContain(OMNIFEED_MAP[mode].lobsters)
    }
  })

  it('maps to valid DEV.to feed IDs', () => {
    const validDevto = SOURCES.find(s => s.id === 'devto')!.feeds.map(f => f.id)
    for (const mode of modes) {
      expect(validDevto).toContain(OMNIFEED_MAP[mode].devto)
    }
  })
})

describe('FeedView type', () => {
  it('accepts ContentSource values', () => {
    const view: FeedView = 'hackernews'
    expect(view).toBe('hackernews')
  })

  it('accepts omnifeed', () => {
    const view: FeedView = 'omnifeed'
    expect(view).toBe('omnifeed')
  })
})
