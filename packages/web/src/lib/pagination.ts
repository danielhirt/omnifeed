export const PAGE_SIZE = 10

export function paginateItems<T>(items: T[], page: number): T[] {
  return items.slice(0, page * PAGE_SIZE)
}

export function hasMoreItems<T>(displayed: T[], total: T[], fetchedAll: boolean): boolean {
  return displayed.length < total.length || !fetchedAll
}

export const SCROLL_TO_TOP_THRESHOLD = 800
