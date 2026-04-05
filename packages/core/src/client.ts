import type { Story, Comment, User } from './models.js'

const BASE_URL = 'https://hacker-news.firebaseio.com'

type FetchFn = typeof globalThis.fetch

export class HnClient {
  private fetch: FetchFn

  constructor(fetchFn?: FetchFn) {
    this.fetch = fetchFn ?? globalThis.fetch.bind(globalThis)
  }

  async fetchFeedIds(endpoint: string): Promise<number[]> {
    const res = await this.fetch(`${BASE_URL}/v0/${endpoint}.json`)
    if (!res.ok) throw new Error(`HN API error: ${res.status}`)
    return res.json()
  }

  async fetchItem(id: number): Promise<(Story | Comment) | null> {
    const res = await this.fetch(`${BASE_URL}/v0/item/${id}.json`)
    if (!res.ok) throw new Error(`HN API error: ${res.status}`)
    return res.json()
  }

  async fetchUser(id: string): Promise<User | null> {
    const res = await this.fetch(`${BASE_URL}/v0/user/${id}.json`)
    if (!res.ok) throw new Error(`HN API error: ${res.status}`)
    return res.json()
  }
}
