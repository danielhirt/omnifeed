import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('$app/environment', () => ({ browser: true }))

import { rewriteInternalLinks } from '../src/lib/internal-links'

describe('rewriteInternalLinks', () => {
  it('rewrites HN item links to internal routes', () => {
    const html = '<p>See <a href="https://news.ycombinator.com/item?id=12345">this</a></p>'
    const result = rewriteInternalLinks(html)
    expect(result).toContain('href="/item/hn:12345"')
    // The href attribute (not data-original-href) no longer points externally
    expect(result).not.toMatch(/(?<!data-original-)href="https:\/\/news\.ycombinator\.com/)
  })

  it('rewrites Lobsters story links to internal routes', () => {
    const html = '<a href="https://lobste.rs/s/abc123">post</a>'
    const result = rewriteInternalLinks(html)
    expect(result).toContain('href="/item/lo:abc123"')
  })

  it('preserves the original href in data-original-href', () => {
    const html = '<a href="https://news.ycombinator.com/item?id=42">link</a>'
    const result = rewriteInternalLinks(html)
    expect(result).toContain('data-original-href="https://news.ycombinator.com/item?id=42"')
  })

  it('strips target and rel from rewritten links so they navigate in-tab', () => {
    const html = '<a href="https://news.ycombinator.com/item?id=1" target="_blank" rel="noopener">x</a>'
    const result = rewriteInternalLinks(html)
    expect(result).not.toContain('target=')
    expect(result).not.toContain('rel=')
    expect(result).toContain('href="/item/hn:1"')
  })

  it('leaves external links unchanged', () => {
    const html = '<a href="https://example.com/article">external</a>'
    const result = rewriteInternalLinks(html)
    expect(result).toContain('href="https://example.com/article"')
    expect(result).not.toContain('data-original-href')
  })

  it('handles multiple anchors in one body', () => {
    const html = `
      <p>First <a href="https://news.ycombinator.com/item?id=1">a</a></p>
      <p>Second <a href="https://example.com">b</a></p>
      <p>Third <a href="https://lobste.rs/s/xyz">c</a></p>
    `
    const result = rewriteInternalLinks(html)
    expect(result).toContain('href="/item/hn:1"')
    expect(result).toContain('href="https://example.com"')
    expect(result).toContain('href="/item/lo:xyz"')
  })

  it('preserves the link text content', () => {
    const html = '<a href="https://news.ycombinator.com/item?id=99">click here</a>'
    const result = rewriteInternalLinks(html)
    expect(result).toContain('>click here</a>')
  })

  it('handles HTML without any anchors', () => {
    const html = '<p>plain text with no links</p>'
    const result = rewriteInternalLinks(html)
    expect(result).toContain('plain text with no links')
  })

  it('returns input unchanged for empty string', () => {
    expect(rewriteInternalLinks('')).toBe('')
  })

  it('handles anchors with extra attributes', () => {
    const html = '<a href="https://news.ycombinator.com/item?id=5" class="foo" id="bar">x</a>'
    const result = rewriteInternalLinks(html)
    expect(result).toContain('class="foo"')
    expect(result).toContain('id="bar"')
    expect(result).toContain('href="/item/hn:5"')
  })
})

describe('rewriteInternalLinks (server-side)', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('passes HTML through unchanged when not in browser', async () => {
    vi.doMock('$app/environment', () => ({ browser: false }))
    const mod = await import('../src/lib/internal-links')
    const html = '<a href="https://news.ycombinator.com/item?id=1">x</a>'
    expect(mod.rewriteInternalLinks(html)).toBe(html)
  })
})
