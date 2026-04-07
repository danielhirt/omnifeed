import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { timeAgo, domainFrom } from '../src/lib/time'

describe('timeAgo', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-06-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function unixSecondsAgo(seconds: number): number {
    return Math.floor(Date.now() / 1000) - seconds
  }

  it('returns "just now" for less than a minute', () => {
    expect(timeAgo(unixSecondsAgo(0))).toBe('just now')
    expect(timeAgo(unixSecondsAgo(30))).toBe('just now')
    expect(timeAgo(unixSecondsAgo(59))).toBe('just now')
  })

  it('returns minutes for less than an hour', () => {
    expect(timeAgo(unixSecondsAgo(60))).toBe('1m ago')
    expect(timeAgo(unixSecondsAgo(300))).toBe('5m ago')
    expect(timeAgo(unixSecondsAgo(3599))).toBe('59m ago')
  })

  it('returns hours for less than a day', () => {
    expect(timeAgo(unixSecondsAgo(3600))).toBe('1h ago')
    expect(timeAgo(unixSecondsAgo(7200))).toBe('2h ago')
    expect(timeAgo(unixSecondsAgo(86399))).toBe('23h ago')
  })

  it('returns days for less than a month', () => {
    expect(timeAgo(unixSecondsAgo(86400))).toBe('1d ago')
    expect(timeAgo(unixSecondsAgo(86400 * 7))).toBe('7d ago')
    expect(timeAgo(unixSecondsAgo(86400 * 29))).toBe('29d ago')
  })

  it('returns months for less than a year', () => {
    expect(timeAgo(unixSecondsAgo(86400 * 30))).toBe('1mo ago')
    expect(timeAgo(unixSecondsAgo(86400 * 90))).toBe('3mo ago')
    expect(timeAgo(unixSecondsAgo(86400 * 364))).toBe('12mo ago')
  })

  it('returns years for a year or more', () => {
    expect(timeAgo(unixSecondsAgo(86400 * 365))).toBe('1y ago')
    expect(timeAgo(unixSecondsAgo(86400 * 730))).toBe('2y ago')
    expect(timeAgo(unixSecondsAgo(86400 * 365 * 10))).toBe('10y ago')
  })
})

describe('domainFrom', () => {
  it('extracts domain from a full URL', () => {
    expect(domainFrom('https://example.com/page')).toBe('example.com')
  })

  it('strips www prefix', () => {
    expect(domainFrom('https://www.example.com')).toBe('example.com')
  })

  it('preserves subdomains other than www', () => {
    expect(domainFrom('https://blog.example.com')).toBe('blog.example.com')
  })

  it('handles http URLs', () => {
    expect(domainFrom('http://example.com')).toBe('example.com')
  })

  it('returns empty string for undefined', () => {
    expect(domainFrom(undefined)).toBe('')
  })

  it('returns empty string for empty string', () => {
    expect(domainFrom('')).toBe('')
  })

  it('returns empty string for invalid URL', () => {
    expect(domainFrom('not-a-url')).toBe('')
  })
})
