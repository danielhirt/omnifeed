import { describe, it, expect } from 'vitest'
import { PAGE_SIZE, paginateItems, hasMoreItems, SCROLL_TO_TOP_THRESHOLD } from '../src/lib/pagination'

describe('PAGE_SIZE', () => {
  it('is 10', () => {
    expect(PAGE_SIZE).toBe(10)
  })
})

describe('paginateItems', () => {
  const items = Array.from({ length: 35 }, (_, i) => i)

  it('returns first page of items', () => {
    const result = paginateItems(items, 1)
    expect(result).toHaveLength(10)
    expect(result).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  })

  it('returns first two pages of items', () => {
    const result = paginateItems(items, 2)
    expect(result).toHaveLength(20)
    expect(result[0]).toBe(0)
    expect(result[19]).toBe(19)
  })

  it('returns first three pages of items', () => {
    const result = paginateItems(items, 3)
    expect(result).toHaveLength(30)
  })

  it('returns all items when page exceeds total', () => {
    const result = paginateItems(items, 10)
    expect(result).toHaveLength(35)
  })

  it('returns empty array for empty input', () => {
    expect(paginateItems([], 1)).toEqual([])
  })

  it('handles fewer items than page size', () => {
    const small = [1, 2, 3]
    expect(paginateItems(small, 1)).toEqual([1, 2, 3])
  })

  it('does not mutate the original array', () => {
    const original = [1, 2, 3]
    const result = paginateItems(original, 1)
    expect(result).not.toBe(original)
  })
})

describe('hasMoreItems', () => {
  it('returns true when displayed is less than total', () => {
    const displayed = [1, 2, 3]
    const total = [1, 2, 3, 4, 5]
    expect(hasMoreItems(displayed, total, true)).toBe(true)
  })

  it('returns true when not all items fetched from source', () => {
    const items = [1, 2, 3]
    expect(hasMoreItems(items, items, false)).toBe(true)
  })

  it('returns false when all displayed and all fetched', () => {
    const items = [1, 2, 3]
    expect(hasMoreItems(items, items, true)).toBe(false)
  })

  it('returns true when both conditions are true', () => {
    const displayed = [1, 2]
    const total = [1, 2, 3]
    expect(hasMoreItems(displayed, total, false)).toBe(true)
  })

  it('returns false for empty arrays when all fetched', () => {
    expect(hasMoreItems([], [], true)).toBe(false)
  })
})

describe('SCROLL_TO_TOP_THRESHOLD', () => {
  it('is a positive number', () => {
    expect(SCROLL_TO_TOP_THRESHOLD).toBeGreaterThan(0)
  })

  it('is 800px', () => {
    expect(SCROLL_TO_TOP_THRESHOLD).toBe(800)
  })
})
