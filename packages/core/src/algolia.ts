import type { FeedItem } from './models.js'

type FetchFn = typeof globalThis.fetch

interface AlgoliaHit {
  objectID: string
  title: string
  url?: string
  author: string
  points: number | null
  num_comments: number | null
  created_at_i: number
  story_id?: number
  story_text?: string | null
}

interface AlgoliaResponse {
  hits: AlgoliaHit[]
  nbPages: number
  page: number
  hitsPerPage: number
}

export interface AlgoliaSearchOptions {
  page?: number
  hitsPerPage?: number
  sortByDate?: boolean
}

export interface AlgoliaSearchResult {
  items: FeedItem[]
  totalPages: number
  page: number
}

const BASE_URL = 'https://hn.algolia.com/api/v1'

export class AlgoliaClient {
  private fetch: FetchFn

  constructor(fetchFn?: FetchFn) {
    this.fetch = fetchFn ?? globalThis.fetch.bind(globalThis)
  }

  async search(query: string, options: AlgoliaSearchOptions = {}): Promise<AlgoliaSearchResult> {
    const { page = 0, hitsPerPage = 30, sortByDate = false } = options
    const endpoint = sortByDate ? 'search_by_date' : 'search'
    const params = new URLSearchParams({
      query,
      tags: 'story',
      page: String(page),
      hitsPerPage: String(hitsPerPage),
    })

    const res = await this.fetch(`${BASE_URL}/${endpoint}?${params}`)
    if (!res.ok) throw new Error(`Algolia API error: ${res.status}`)

    const data: AlgoliaResponse = await res.json()

    return {
      items: data.hits.filter(hit => hit.title).map(hitToFeedItem),
      totalPages: data.nbPages,
      page: data.page,
    }
  }
}

function hitToFeedItem(hit: AlgoliaHit): FeedItem {
  const numericId = hit.story_id ?? Number(hit.objectID)
  return {
    id: `hn:${numericId}`,
    source: 'hackernews',
    title: hit.title,
    url: hit.url ?? undefined,
    text: hit.story_text ?? undefined,
    score: hit.points ?? 0,
    author: hit.author,
    timestamp: hit.created_at_i,
    commentCount: hit.num_comments ?? 0,
    sourceUrl: `https://news.ycombinator.com/item?id=${numericId}`,
    originalId: numericId,
  }
}
