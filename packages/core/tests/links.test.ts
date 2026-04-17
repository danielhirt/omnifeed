import { describe, it, expect } from 'vitest'
import { toInternalRoute } from '../src/links.js'

describe('toInternalRoute', () => {
  describe('Hacker News', () => {
    it('converts a basic HN item URL', () => {
      expect(toInternalRoute('https://news.ycombinator.com/item?id=12345')).toBe('/item/hn:12345')
    })

    it('handles http (not https)', () => {
      expect(toInternalRoute('http://news.ycombinator.com/item?id=99')).toBe('/item/hn:99')
    })

    it('handles extra query parameters before id', () => {
      expect(toInternalRoute('https://news.ycombinator.com/item?p=2&id=42')).toBe('/item/hn:42')
    })

    it('handles a trailing fragment', () => {
      expect(toInternalRoute('https://news.ycombinator.com/item?id=42#c_99')).toBe('/item/hn:42')
    })

    it('handles a comment ID (HN uses /item for both stories and comments)', () => {
      // Caller is responsible for resolving comment to root story
      expect(toInternalRoute('https://news.ycombinator.com/item?id=47668520')).toBe('/item/hn:47668520')
    })

    it('returns null for HN URLs without an id param', () => {
      expect(toInternalRoute('https://news.ycombinator.com/item')).toBeNull()
      expect(toInternalRoute('https://news.ycombinator.com/newest')).toBeNull()
    })

    it('returns null for HN URLs with non-numeric id', () => {
      expect(toInternalRoute('https://news.ycombinator.com/item?id=abc')).toBeNull()
    })

    it('does not match similar but unrelated hosts', () => {
      expect(toInternalRoute('https://newsxycombinator.com/item?id=1')).toBeNull()
      expect(toInternalRoute('https://example.com/news.ycombinator.com/item?id=1')).toBeNull()
    })
  })

  describe('Lobsters', () => {
    it('converts a basic Lobsters story URL', () => {
      expect(toInternalRoute('https://lobste.rs/s/abc123')).toBe('/item/lo:abc123')
    })

    it('handles a slug suffix', () => {
      expect(toInternalRoute('https://lobste.rs/s/abc123/some-post-title')).toBe('/item/lo:abc123')
    })

    it('handles trailing fragment', () => {
      expect(toInternalRoute('https://lobste.rs/s/abc123#c_xyz')).toBe('/item/lo:abc123')
    })

    it('handles trailing query', () => {
      expect(toInternalRoute('https://lobste.rs/s/abc123?ref=foo')).toBe('/item/lo:abc123')
    })

    it('is case-insensitive on the protocol/host but preserves short_id case', () => {
      // Lobsters short_ids are lowercase alphanumeric in practice
      expect(toInternalRoute('HTTPS://LOBSTE.RS/s/abc123')).toBe('/item/lo:abc123')
    })

    it('returns null for Lobsters non-story URLs', () => {
      expect(toInternalRoute('https://lobste.rs/')).toBeNull()
      expect(toInternalRoute('https://lobste.rs/u/someone')).toBeNull()
      expect(toInternalRoute('https://lobste.rs/t/programming')).toBeNull()
    })
  })

  describe('unsupported URLs', () => {
    it('returns null for arbitrary external URLs', () => {
      expect(toInternalRoute('https://example.com/article')).toBeNull()
      expect(toInternalRoute('https://github.com/user/repo')).toBeNull()
      expect(toInternalRoute('https://dev.to/user/post-abc123')).toBeNull()
    })

    it('returns null for relative URLs', () => {
      expect(toInternalRoute('/item/hn:1')).toBeNull()
      expect(toInternalRoute('item?id=1')).toBeNull()
    })

    it('returns null for empty or malformed input', () => {
      expect(toInternalRoute('')).toBeNull()
      expect(toInternalRoute('not a url')).toBeNull()
    })
  })
})
