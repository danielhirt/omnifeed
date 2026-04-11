import { describe, it, expect, vi } from 'vitest'
import { LobstersClient } from '../src/lobsters.js'

function makeLobstersStoryResponse() {
  return {
    short_id: 'abc123', title: 'Test Story', url: 'https://example.com',
    score: 42, created_at: '2024-01-15T10:30:00.000-06:00', submitter_user: 'testuser',
    comment_count: 3, comments_url: 'https://lobste.rs/s/abc123/test_story',
    short_id_url: 'https://lobste.rs/s/abc123', description: '', tags: ['programming'],
    comments: [
      { short_id: 'c1', comment: '<p>Top level</p>', comment_plain: 'Top level',
        commenting_user: 'user1', created_at: '2024-01-15T11:00:00.000-06:00',
        score: 5, depth: 0, parent_comment: null, is_deleted: false, is_moderated: false,
        short_id_url: 'https://lobste.rs/c/c1', url: 'https://lobste.rs/c/c1' },
      { short_id: 'c2', comment: '<p>Reply</p>', comment_plain: 'Reply',
        commenting_user: 'user2', created_at: '2024-01-15T12:00:00.000-06:00',
        score: 3, depth: 1, parent_comment: 'c1', is_deleted: false, is_moderated: false,
        short_id_url: 'https://lobste.rs/c/c2', url: 'https://lobste.rs/c/c2' },
      { short_id: 'c3', comment: '<p>Another top</p>', comment_plain: 'Another top',
        commenting_user: 'user3', created_at: '2024-01-15T13:00:00.000-06:00',
        score: 1, depth: 0, parent_comment: null, is_deleted: false, is_moderated: false,
        short_id_url: 'https://lobste.rs/c/c3', url: 'https://lobste.rs/c/c3' },
    ],
  }
}

function mockFetchStory(data: object) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
  })
}

describe('LobstersClient.fetchStory', () => {
  describe('return shape', () => {
    it('returns story and comments', async () => {
      const fetch = mockFetchStory(makeLobstersStoryResponse())
      const client = new LobstersClient(fetch as any)

      const result = await client.fetchStory('abc123')

      expect(result).toHaveProperty('story')
      expect(result).toHaveProperty('comments')
    })

    it('maps story fields to FeedItem', async () => {
      const fetch = mockFetchStory(makeLobstersStoryResponse())
      const client = new LobstersClient(fetch as any)

      const { story } = await client.fetchStory('abc123')

      expect(story.id).toBe('lo:abc123')
      expect(story.source).toBe('lobsters')
      expect(story.title).toBe('Test Story')
      expect(story.url).toBe('https://example.com')
      expect(story.score).toBe(42)
      expect(story.author).toBe('testuser')
      expect(story.commentCount).toBe(3)
      expect(story.sourceUrl).toBe('https://lobste.rs/s/abc123/test_story')
      expect(story.tags).toEqual(['programming'])
    })
  })

  describe('URL construction', () => {
    it('calls /s/{shortId}.json', async () => {
      const fetch = mockFetchStory(makeLobstersStoryResponse())
      const client = new LobstersClient(fetch as any)

      await client.fetchStory('abc123')

      expect(fetch).toHaveBeenCalledWith('https://lobste.rs/s/abc123.json')
    })

    it('uses custom baseUrl when provided', async () => {
      const fetch = mockFetchStory(makeLobstersStoryResponse())
      const client = new LobstersClient(fetch as any, 'https://custom.example.com')

      await client.fetchStory('xyz')

      expect(fetch).toHaveBeenCalledWith('https://custom.example.com/s/xyz.json')
    })
  })

  describe('comment tree structure', () => {
    it('returns two top-level comments', async () => {
      const fetch = mockFetchStory(makeLobstersStoryResponse())
      const client = new LobstersClient(fetch as any)

      const { comments } = await client.fetchStory('abc123')

      expect(comments).toHaveLength(2)
    })

    it('nests reply under parent', async () => {
      const fetch = mockFetchStory(makeLobstersStoryResponse())
      const client = new LobstersClient(fetch as any)

      const { comments } = await client.fetchStory('abc123')

      const c1 = comments[0]
      expect(c1.children).toHaveLength(1)
      expect(c1.children[0].author).toBe('user2')
    })

    it('second top-level comment has no children', async () => {
      const fetch = mockFetchStory(makeLobstersStoryResponse())
      const client = new LobstersClient(fetch as any)

      const { comments } = await client.fetchStory('abc123')

      const c3 = comments[1]
      expect(c3.children).toHaveLength(0)
    })
  })

  describe('comment field mapping', () => {
    it('sets id as lo:<short_id>', async () => {
      const fetch = mockFetchStory(makeLobstersStoryResponse())
      const client = new LobstersClient(fetch as any)

      const { comments } = await client.fetchStory('abc123')

      expect(comments[0].id).toBe('lo:c1')
    })

    it('sets source to lobsters', async () => {
      const fetch = mockFetchStory(makeLobstersStoryResponse())
      const client = new LobstersClient(fetch as any)

      const { comments } = await client.fetchStory('abc123')

      expect(comments[0].source).toBe('lobsters')
    })

    it('preserves score', async () => {
      const fetch = mockFetchStory(makeLobstersStoryResponse())
      const client = new LobstersClient(fetch as any)

      const { comments } = await client.fetchStory('abc123')

      expect(comments[0].score).toBe(5)
    })

    it('sets sourceUrl from short_id_url', async () => {
      const fetch = mockFetchStory(makeLobstersStoryResponse())
      const client = new LobstersClient(fetch as any)

      const { comments } = await client.fetchStory('abc123')

      expect(comments[0].sourceUrl).toBe('https://lobste.rs/c/c1')
    })

    it('converts created_at to unix timestamp', async () => {
      const fetch = mockFetchStory(makeLobstersStoryResponse())
      const client = new LobstersClient(fetch as any)

      const { comments } = await client.fetchStory('abc123')

      expect(comments[0].timestamp).toBe(
        Math.floor(new Date('2024-01-15T11:00:00.000-06:00').getTime() / 1000)
      )
    })

    it('sets depth from raw comment', async () => {
      const fetch = mockFetchStory(makeLobstersStoryResponse())
      const client = new LobstersClient(fetch as any)

      const { comments } = await client.fetchStory('abc123')

      expect(comments[0].depth).toBe(0)
      expect(comments[0].children[0].depth).toBe(1)
    })

    it('sets text from comment html', async () => {
      const fetch = mockFetchStory(makeLobstersStoryResponse())
      const client = new LobstersClient(fetch as any)

      const { comments } = await client.fetchStory('abc123')

      expect(comments[0].text).toBe('<p>Top level</p>')
    })
  })

  describe('filtering', () => {
    it('skips deleted comments', async () => {
      const data = makeLobstersStoryResponse()
      data.comments[0] = { ...data.comments[0], is_deleted: true }
      const fetch = mockFetchStory(data)
      const client = new LobstersClient(fetch as any)

      const { comments } = await client.fetchStory('abc123')

      // c1 deleted: c2 (its child) has no parent in map → goes to root, c3 stays
      const ids = comments.map(c => c.id)
      expect(ids).not.toContain('lo:c1')
    })

    it('skips moderated comments', async () => {
      const data = makeLobstersStoryResponse()
      data.comments[2] = { ...data.comments[2], is_moderated: true }
      const fetch = mockFetchStory(data)
      const client = new LobstersClient(fetch as any)

      const { comments } = await client.fetchStory('abc123')

      const ids = [
        ...comments.map(c => c.id),
        ...comments.flatMap(c => c.children.map(ch => ch.id)),
      ]
      expect(ids).not.toContain('lo:c3')
    })

    it('returns empty comments array when all are deleted', async () => {
      const data = makeLobstersStoryResponse()
      data.comments = data.comments.map(c => ({ ...c, is_deleted: true }))
      const fetch = mockFetchStory(data)
      const client = new LobstersClient(fetch as any)

      const { comments } = await client.fetchStory('abc123')

      expect(comments).toHaveLength(0)
    })
  })

  describe('error handling', () => {
    it('throws on non-ok response', async () => {
      const fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 })
      const client = new LobstersClient(fetch as any)

      await expect(client.fetchStory('missing')).rejects.toThrow('Lobsters API error: 404')
    })
  })
})
