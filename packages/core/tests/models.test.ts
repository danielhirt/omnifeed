import { describe, it, expect } from 'vitest'
import { SOURCES, type FeedItem, type ContentSource, type SourceConfig } from '../src/models.js'

describe('SOURCES', () => {
  it('has all 3 sources', () => {
    expect(SOURCES).toHaveLength(3)
    const ids = SOURCES.map((s) => s.id)
    expect(ids).toContain('hackernews')
    expect(ids).toContain('lobsters')
    expect(ids).toContain('devto')
  })

  it('each feed has source matching its parent source id', () => {
    for (const source of SOURCES) {
      for (const feed of source.feeds) {
        expect(feed.source).toBe(source.id)
      }
    }
  })

  it('hackernews has 6 feeds', () => {
    const hn = SOURCES.find((s) => s.id === 'hackernews')!
    expect(hn.feeds).toHaveLength(6)
  })

  it('lobsters has 3 feeds', () => {
    const lobsters = SOURCES.find((s) => s.id === 'lobsters')!
    expect(lobsters.feeds).toHaveLength(3)
  })

  it('devto has 3 feeds', () => {
    const devto = SOURCES.find((s) => s.id === 'devto')!
    expect(devto.feeds).toHaveLength(3)
  })

  it('each source has required config fields', () => {
    for (const source of SOURCES) {
      expect(source.id).toBeTruthy()
      expect(source.name).toBeTruthy()
      expect(source.shortName).toBeTruthy()
      expect(source.color).toMatch(/^#[0-9a-f]{6}$/i)
      expect(Array.isArray(source.feeds)).toBe(true)
    }
  })
})
