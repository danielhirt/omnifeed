import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/svelte'
import Page from '../src/routes/item/[id]/+page.svelte'

// Mock SvelteKit's $app/state to provide the route param
vi.mock('$app/state', () => ({
  page: { params: { id: 'hn:123' } },
}))

vi.mock('$app/environment', () => ({
  browser: false,
}))

vi.mock('$lib/feed.svelte', () => ({
  setRefreshHandler: vi.fn(),
  getFeedState: () => ({ value: { items: [], loading: false } }),
}))

vi.mock('$lib/summaries.svelte', () => ({
  getSummary: () => undefined,
  saveSummary: vi.fn(),
  clearSummary: vi.fn(),
  isExpanded: () => false,
  setExpanded: vi.fn(),
}))

vi.mock('$lib/settings.svelte', () => ({
  getSettings: () => ({ value: { model: 'sonnet' } }),
}))

vi.mock('$lib/toast.svelte', () => ({
  showToast: vi.fn(() => 'toast-id'),
  updateToast: vi.fn(),
}))

vi.mock('$lib/collections.svelte', () => ({
  getCollections: () => ({ value: [] }),
  addToCollection: vi.fn(),
  removeFromCollection: vi.fn(),
}))

beforeEach(() => {
  vi.restoreAllMocks()
})

const STORY_FIXTURE = {
  id: 123,
  title: 'Story-First Render Test',
  url: 'https://example.com',
  score: 100,
  by: 'tester',
  time: Math.floor(Date.now() / 1000),
  descendants: 1,
  kids: [456],
  type: 'story',
}

const COMMENT_FIXTURE = {
  id: 456,
  text: 'A comment',
  by: 'commenter',
  time: Math.floor(Date.now() / 1000),
  parent: 123,
}

describe('item page story-first loading', () => {
  it('renders story header before comment tree when comments are slow', async () => {
    let resolveComment!: (v: unknown) => void
    const commentPromise = new Promise(r => { resolveComment = r })

    // First fetch is the story (resolve immediately).
    // Subsequent fetches are comments (block on commentPromise).
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.endsWith(`/item/${STORY_FIXTURE.id}.json`)) {
        return new Response(JSON.stringify(STORY_FIXTURE), { status: 200 })
      }
      // Comment fetch: wait until we explicitly resolve
      await commentPromise
      return new Response(JSON.stringify(COMMENT_FIXTURE), { status: 200 })
    }))

    const { container } = render(Page)

    // Wait for the story title to appear
    await vi.waitFor(() => {
      expect(container.querySelector('.story-title')).toBeTruthy()
    })

    // At this point comments are still loading: tree absent, "Loading comments..." present
    expect(container.querySelector('.story-title')!.textContent).toContain('Story-First Render Test')
    expect(container.querySelector('.comment-tree')).toBeFalsy()
    expect(container.querySelector('.comments-loading')).toBeTruthy()
    expect(container.querySelector('.comments-loading')!.textContent).toBe('Loading comments...')

    // Now resolve the comment fetch
    resolveComment(COMMENT_FIXTURE)

    // Comment tree should now appear; loading indicator should be gone
    await vi.waitFor(() => {
      expect(container.querySelector('.comment-tree')).toBeTruthy()
    })
    expect(container.querySelector('.comments-loading')).toBeFalsy()
  })

  it('shows the global Loading... only while story is loading', async () => {
    let resolveStory!: (v: unknown) => void
    const storyPromise = new Promise(r => { resolveStory = r })

    vi.stubGlobal('fetch', vi.fn(async () => {
      await storyPromise
      return new Response(JSON.stringify({ ...STORY_FIXTURE, kids: [] }), { status: 200 })
    }))

    const { container } = render(Page)

    // Initially: top-level "Loading..." is shown, no story header
    expect(container.querySelector('.loading')).toBeTruthy()
    expect(container.querySelector('.loading')!.textContent).toBe('Loading...')
    expect(container.querySelector('.story-title')).toBeFalsy()

    // Resolve the story; story header takes over
    resolveStory(STORY_FIXTURE)

    await vi.waitFor(() => {
      expect(container.querySelector('.story-title')).toBeTruthy()
    })
    expect(container.querySelector('p.loading')).toBeFalsy()
  })

  it('does not show "Loading comments..." when story has no kids', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      return new Response(JSON.stringify({ ...STORY_FIXTURE, kids: [] }), { status: 200 })
    }))

    const { container } = render(Page)

    await vi.waitFor(() => {
      expect(container.querySelector('.story-title')).toBeTruthy()
    })
    expect(container.querySelector('.comments-loading')).toBeFalsy()
    expect(container.querySelector('.no-comments')).toBeTruthy()
  })
})

describe('item page chunked HN root loading', () => {
  // Build a story with 50 kids so initial chunk (30) leaves 20 pending
  const ROOT_KIDS = Array.from({ length: 50 }, (_, i) => 1000 + i)
  const STORY_50 = { ...STORY_FIXTURE, descendants: 50, kids: ROOT_KIDS }

  function makeFakeFetch() {
    const calls: string[] = []
    const fetchFn = vi.fn(async (url: string) => {
      calls.push(url)
      if (url.endsWith(`/item/${STORY_50.id}.json`)) {
        return new Response(JSON.stringify(STORY_50), { status: 200 })
      }
      // Comment fetch: extract id and return a comment fixture
      const match = url.match(/\/item\/(\d+)\.json$/)
      const id = match ? Number(match[1]) : 0
      return new Response(JSON.stringify({
        id,
        text: `Comment ${id}`,
        by: `user${id}`,
        time: id,  // Use id as timestamp so we can verify sort order
        parent: STORY_50.id,
      }), { status: 200 })
    })
    vi.stubGlobal('fetch', fetchFn)
    return { fetchFn, calls }
  }

  it('initial render fetches only ROOT_CHUNK (30) roots, not all 50', async () => {
    const { fetchFn } = makeFakeFetch()
    const { container } = render(Page)

    await vi.waitFor(() => {
      const tree = container.querySelector('.comment-tree')
      expect(tree?.querySelectorAll(':scope > .comment-node').length).toBe(30)
    })

    // 1 story fetch + 30 comment fetches = 31 total
    expect(fetchFn).toHaveBeenCalledTimes(31)
  })

  it('shows "Load more comments" button with remaining count', async () => {
    makeFakeFetch()
    const { container } = render(Page)

    await vi.waitFor(() => {
      expect(container.querySelector('.load-more-btn')).toBeTruthy()
    })
    const btn = container.querySelector('.load-more-btn')!
    // 50 - 30 = 20 remaining
    expect(btn.textContent).toContain('20 remaining')
  })

  it('clicking Newest sort triggers auto-load of remaining roots', async () => {
    const { fetchFn } = makeFakeFetch()
    const { container } = render(Page)

    // Wait for initial 30 roots
    await vi.waitFor(() => {
      expect(container.querySelectorAll('.comment-tree > .comment-node').length).toBe(30)
    })
    const callsBeforeSort = fetchFn.mock.calls.length

    // Click Newest
    const buttons = container.querySelectorAll('.controls-right .control-btn')
    const newestBtn = Array.from(buttons).find(b => b.textContent?.trim() === 'Newest')!
    await fireEvent.click(newestBtn)

    // Auto-load indicator should appear
    expect(container.querySelector('.sort-loading')).toBeTruthy()

    // Wait for all roots to load
    await vi.waitFor(() => {
      expect(container.querySelectorAll('.comment-tree > .comment-node').length).toBe(50)
    })

    // Indicator gone
    expect(container.querySelector('.sort-loading')).toBeFalsy()
    // "Load more" button hidden (nothing pending)
    expect(container.querySelector('.load-more-btn')).toBeFalsy()
    // 20 additional fetches were issued
    expect(fetchFn.mock.calls.length).toBe(callsBeforeSort + 20)
  })

  it('clicking Oldest also triggers auto-load', async () => {
    const { fetchFn } = makeFakeFetch()
    const { container } = render(Page)

    await vi.waitFor(() => {
      expect(container.querySelectorAll('.comment-tree > .comment-node').length).toBe(30)
    })
    const callsBeforeSort = fetchFn.mock.calls.length

    const buttons = container.querySelectorAll('.controls-right .control-btn')
    const oldestBtn = Array.from(buttons).find(b => b.textContent?.trim() === 'Oldest')!
    await fireEvent.click(oldestBtn)

    await vi.waitFor(() => {
      expect(container.querySelectorAll('.comment-tree > .comment-node').length).toBe(50)
    })
    expect(fetchFn.mock.calls.length).toBe(callsBeforeSort + 20)
  })

  it('Default sort does NOT trigger auto-load', async () => {
    const { fetchFn } = makeFakeFetch()
    const { container } = render(Page)

    await vi.waitFor(() => {
      expect(container.querySelectorAll('.comment-tree > .comment-node').length).toBe(30)
    })
    const callsBeforeSort = fetchFn.mock.calls.length

    const buttons = container.querySelectorAll('.controls-right .control-btn')
    const defaultBtn = Array.from(buttons).find(b => b.textContent?.trim() === 'Default')!
    await fireEvent.click(defaultBtn)

    // Give the effect a chance to fire
    await new Promise(r => setTimeout(r, 50))

    // No new fetches; still showing 30
    expect(fetchFn.mock.calls.length).toBe(callsBeforeSort)
    expect(container.querySelectorAll('.comment-tree > .comment-node').length).toBe(30)
    expect(container.querySelector('.sort-loading')).toBeFalsy()
    expect(container.querySelector('.load-more-btn')).toBeTruthy()
  })

  it('clicking "Load more comments" appends the next chunk', async () => {
    const { fetchFn } = makeFakeFetch()
    const { container } = render(Page)

    await vi.waitFor(() => {
      expect(container.querySelectorAll('.comment-tree > .comment-node').length).toBe(30)
    })
    const callsBeforeMore = fetchFn.mock.calls.length

    const moreBtn = container.querySelector('.load-more-btn') as HTMLButtonElement
    await fireEvent.click(moreBtn)

    await vi.waitFor(() => {
      expect(container.querySelectorAll('.comment-tree > .comment-node').length).toBe(50)
    })
    expect(fetchFn.mock.calls.length).toBe(callsBeforeMore + 20)
  })
})
