import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/svelte'
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
