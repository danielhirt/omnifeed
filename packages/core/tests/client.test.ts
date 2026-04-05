import { describe, it, expect, vi, beforeEach } from 'vitest'
import { HnClient } from '../src/client.js'

const BASE = 'https://hacker-news.firebaseio.com'

describe('HnClient', () => {
  let client: HnClient
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch = vi.fn()
    client = new HnClient(mockFetch)
  })

  it('fetches story IDs for a feed', async () => {
    const ids = [1, 2, 3]
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(ids),
    })

    const result = await client.fetchFeedIds('topstories')
    expect(result).toEqual(ids)
    expect(mockFetch).toHaveBeenCalledWith(`${BASE}/v0/topstories.json`)
  })

  it('fetches a single item', async () => {
    const story = { id: 1, title: 'Test', type: 'story' }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(story),
    })

    const result = await client.fetchItem(1)
    expect(result).toEqual(story)
    expect(mockFetch).toHaveBeenCalledWith(`${BASE}/v0/item/1.json`)
  })

  it('returns null for deleted/missing items', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(null),
    })

    const result = await client.fetchItem(999)
    expect(result).toBeNull()
  })

  it('fetches a user profile', async () => {
    const user = { id: 'pg', karma: 1000 }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(user),
    })

    const result = await client.fetchUser('pg')
    expect(result).toEqual(user)
    expect(mockFetch).toHaveBeenCalledWith(`${BASE}/v0/user/pg.json`)
  })

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    })

    await expect(client.fetchFeedIds('topstories')).rejects.toThrow('HN API error: 500')
  })
})
