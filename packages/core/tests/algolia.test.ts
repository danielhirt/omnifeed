import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AlgoliaClient } from '../src/algolia.js'

const BASE_URL = 'https://hn.algolia.com/api/v1'

function makeHit(overrides: Record<string, unknown> = {}) {
  return {
    objectID: '12345',
    title: 'Test Story',
    url: 'https://example.com',
    author: 'testuser',
    points: 100,
    num_comments: 42,
    created_at_i: 1700000000,
    story_text: null,
    ...overrides,
  }
}

function makeResponse(hits: unknown[], overrides: Record<string, unknown> = {}) {
  return {
    hits,
    nbPages: 5,
    page: 0,
    hitsPerPage: 30,
    ...overrides,
  }
}

describe('AlgoliaClient', () => {
  let client: AlgoliaClient
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch = vi.fn()
    client = new AlgoliaClient(mockFetch)
  })

  it('maps hits to FeedItem[] with correct field mapping', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(makeResponse([makeHit()])),
    })

    const result = await client.search('svelte')

    expect(result.items).toHaveLength(1)
    const item = result.items[0]
    expect(item.id).toBe('hn:12345')
    expect(item.source).toBe('hackernews')
    expect(item.title).toBe('Test Story')
    expect(item.url).toBe('https://example.com')
    expect(item.score).toBe(100)
    expect(item.author).toBe('testuser')
    expect(item.timestamp).toBe(1700000000)
    expect(item.commentCount).toBe(42)
    expect(item.sourceUrl).toBe('https://news.ycombinator.com/item?id=12345')
    expect(item.originalId).toBe(12345)
  })

  it('passes query and page params to URL', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(makeResponse([])),
    })

    await client.search('svelte', { page: 2, hitsPerPage: 10 })

    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('query=svelte'))
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('page=2'))
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('hitsPerPage=10'))
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('tags=story'))
  })

  it('uses /search endpoint by default', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(makeResponse([])),
    })

    await client.search('svelte')

    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining(`${BASE_URL}/search?`))
  })

  it('uses /search_by_date endpoint when sortByDate is true', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(makeResponse([])),
    })

    await client.search('svelte', { sortByDate: true })

    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining(`${BASE_URL}/search_by_date?`))
  })

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
    })

    await expect(client.search('svelte')).rejects.toThrow('Algolia API error: 429')
  })

  it('filters out hits without titles', async () => {
    const hits = [
      makeHit({ title: 'Has Title' }),
      makeHit({ title: '', objectID: '99999' }),
    ]
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(makeResponse(hits)),
    })

    const result = await client.search('svelte')

    expect(result.items).toHaveLength(1)
    expect(result.items[0].title).toBe('Has Title')
  })

  it('returns pagination metadata', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(makeResponse([], { nbPages: 7, page: 3 })),
    })

    const result = await client.search('svelte', { page: 3 })

    expect(result.totalPages).toBe(7)
    expect(result.page).toBe(3)
  })

  it('uses story_id over objectID when available', async () => {
    const hit = makeHit({ objectID: '99999', story_id: 12345 })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(makeResponse([hit])),
    })

    const result = await client.search('svelte')

    expect(result.items[0].id).toBe('hn:12345')
    expect(result.items[0].originalId).toBe(12345)
  })

  it('handles null points and num_comments gracefully', async () => {
    const hit = makeHit({ points: null, num_comments: null })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(makeResponse([hit])),
    })

    const result = await client.search('svelte')

    expect(result.items[0].score).toBe(0)
    expect(result.items[0].commentCount).toBe(0)
  })

  it('handles missing url and story_text gracefully', async () => {
    const hit = makeHit({ url: undefined, story_text: undefined })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(makeResponse([hit])),
    })

    const result = await client.search('svelte')

    expect(result.items[0].url).toBeUndefined()
    expect(result.items[0].text).toBeUndefined()
  })
})
