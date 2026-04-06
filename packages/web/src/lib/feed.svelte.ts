import { HnClient, FeedManager, type Story } from '@hackernews/core'

const client = new HnClient()
const feedManager = new FeedManager(client)

interface FeedCache {
  stories: Story[]
  currentPage: number
}

const cache = new Map<string, FeedCache>()

let currentEndpoint = $state('')
let stories = $state<Story[]>([])
let loading = $state(false)
let loadingMore = $state(false)

export function getFeedState() {
  return {
    get stories() { return stories },
    get loading() { return loading },
    get loadingMore() { return loadingMore },
  }
}

export async function loadFeed(endpoint: string) {
  if (endpoint === currentEndpoint && stories.length > 0) return

  currentEndpoint = endpoint
  const cached = cache.get(endpoint)
  if (cached) {
    stories = cached.stories
    loading = false
    return
  }

  loading = true
  const result = await feedManager.fetchPage(endpoint, 0)
  stories = result
  cache.set(endpoint, { stories: result, currentPage: 0 })
  loading = false
}

let customRefresh: (() => void) | null = null

export function setRefreshHandler(handler: (() => void) | null) {
  customRefresh = handler
}

export async function refreshFeed() {
  if (customRefresh) {
    customRefresh()
    return
  }
  cache.delete(currentEndpoint)
  feedManager.clearCache()
  loading = true
  const result = await feedManager.fetchPage(currentEndpoint, 0)
  stories = result
  cache.set(currentEndpoint, { stories: result, currentPage: 0 })
  loading = false
}

export async function loadMore() {
  if (loadingMore || loading) return
  const entry = cache.get(currentEndpoint)
  if (!entry) return

  loadingMore = true
  const nextPage = entry.currentPage + 1
  const result = await feedManager.fetchPage(currentEndpoint, nextPage)
  stories = [...stories, ...result]
  entry.stories = stories
  entry.currentPage = nextPage
  loadingMore = false
}
