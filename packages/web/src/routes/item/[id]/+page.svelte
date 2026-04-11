<script lang="ts">
  import { page } from '$app/state'
  import {
    HnClient, LobstersClient,
    type Story, type FeedItem, type CommentItem, type ContentSource,
    SOURCES,
  } from '@hackernews/core'
  import { fetchHnCommentTree } from '@hackernews/core'
  import { timeAgo, domainFrom } from '$lib/time'
  import CommentTree from '../../../components/CommentTree.svelte'
  import SaveButton from '../../../components/SaveButton.svelte'
  import { setRefreshHandler } from '$lib/feed.svelte'
  import { marked } from 'marked'
  import { getSummary, saveSummary, clearSummary, isExpanded, setExpanded } from '$lib/summaries.svelte'
  import { getSettings } from '$lib/settings.svelte'

  const hnClient = new HnClient()
  const lobstersClient = new LobstersClient(undefined, '/api/lobsters?path=')

  let rawId = $derived(page.params.id ?? '')
  let source = $derived<ContentSource>(
    rawId.startsWith('lo:') ? 'lobsters' :
    rawId.startsWith('dev:') ? 'devto' :
    'hackernews'
  )
  let sourceId = $derived(
    rawId.startsWith('lo:') ? rawId.slice(3) :
    rawId.startsWith('hn:') ? rawId.slice(3) :
    rawId.startsWith('dev:') ? rawId.slice(4) :
    rawId
  )
  let itemId = $derived(
    source === 'hackernews' ? `hn:${sourceId}` :
    source === 'lobsters' ? `lo:${sourceId}` :
    `dev:${sourceId}`
  )

  let title = $state('')
  let url = $state<string | undefined>(undefined)
  let bodyText = $state<string | undefined>(undefined)
  let score = $state(0)
  let author = $state('')
  let timestamp = $state(0)
  let commentCount = $state(0)
  let sourceUrl = $state('')
  let tags = $state<string[]>([])

  let comments = $state<CommentItem[]>([])
  let loading = $state(true)
  let flagged = $state(false)
  let refreshKey = $state(0)

  let domain = $derived(domainFrom(url))
  let sourceConfig = $derived(SOURCES.find(s => s.id === source))
  let isHn = $derived(source === 'hackernews')

  // Focus mode
  let focusStack = $state<string[]>([])

  function findComment(items: CommentItem[], targetId: string): CommentItem | null {
    for (const c of items) {
      if (c.id === targetId) return c
      const found = findComment(c.children, targetId)
      if (found) return found
    }
    return null
  }

  let displayedComments = $derived.by(() => {
    if (focusStack.length === 0) return comments
    const focusedId = focusStack[focusStack.length - 1]
    const focused = findComment(comments, focusedId)
    return focused ? [focused] : comments
  })

  $effect(() => {
    loadItem(source, sourceId)
  })

  $effect(() => {
    setRefreshHandler(() => {
      loadItem(source, sourceId)
      refreshKey++
    })
    return () => setRefreshHandler(null)
  })

  async function loadItem(src: ContentSource, id: string) {
    loading = true
    flagged = false
    focusStack = []
    comments = []

    try {
      if (src === 'hackernews') {
        await loadHnItem(Number(id))
      } else if (src === 'lobsters') {
        await loadLobstersItem(id)
      }
    } catch {
      flagged = true
    }
    loading = false
  }

  async function loadHnItem(id: number) {
    const item = await hnClient.fetchItem(id)
    if (!item || !('title' in item)) {
      flagged = true
      return
    }
    const story = item as Story
    title = story.title
    url = story.url
    bodyText = story.text
    score = story.score
    author = story.by
    timestamp = story.time
    commentCount = story.descendants ?? 0
    sourceUrl = `https://news.ycombinator.com/item?id=${id}`
    tags = []

    if (story.kids?.length) {
      comments = await fetchHnCommentTree(hnClient, story.kids)
    }
  }

  async function loadLobstersItem(shortId: string) {
    const result = await lobstersClient.fetchStory(shortId)
    title = result.story.title
    url = result.story.url
    bodyText = result.story.text
    score = result.story.score
    author = result.story.author
    timestamp = result.story.timestamp
    commentCount = result.story.commentCount
    sourceUrl = result.story.sourceUrl
    tags = result.story.tags ?? []
    comments = result.comments
  }

  function focusComment(commentId: string) {
    focusStack = [...focusStack, commentId]
  }

  function unfocus() {
    focusStack = focusStack.slice(0, -1)
  }

  const appSettings = getSettings()

  let summaryText = $state('')
  let summaryExpanded = $state(false)
  let summaryLoading = $state(false)
  let summaryError = $state('')
  let hasSummary = $derived(!!summaryText || summaryLoading || !!summaryError)

  $effect(() => {
    if (title) {
      const cached = getSummary(itemId)
      if (cached) {
        summaryText = cached
        summaryExpanded = isExpanded(itemId)
      } else {
        summaryText = ''
        summaryExpanded = false
      }
      summaryError = ''
      summaryLoading = false
    }
  })

  let summaryCopied = $state(false)
  let postCopied = $state(false)

  async function copySummary() {
    if (!summaryText) return
    await navigator.clipboard.writeText(summaryText)
    summaryCopied = true
    setTimeout(() => summaryCopied = false, 1500)
  }

  function stripHtml(html: string): string {
    const div = document.createElement('div')
    div.innerHTML = html
    return div.textContent ?? ''
  }

  async function copyPost() {
    let content = ''
    if (bodyText) content += stripHtml(bodyText)
    if (url) {
      if (content) content += '\n\n'
      content += url
    }
    if (!content) return
    await navigator.clipboard.writeText(content)
    postCopied = true
    setTimeout(() => postCopied = false, 1500)
  }

  function toggleSummary() {
    if (!summaryText && !summaryLoading) {
      fetchSummary()
      return
    }
    summaryExpanded = !summaryExpanded
    setExpanded(itemId, summaryExpanded)
  }

  async function fetchSummary() {
    summaryExpanded = true
    summaryText = ''
    summaryError = ''
    summaryLoading = true

    try {
      const body: Record<string, unknown> = { model: appSettings.value.model }
      if (source === 'hackernews') {
        body.storyId = Number(sourceId)
      } else {
        body.title = title
        body.url = url
        body.text = bodyText
        body.comments = comments.slice(0, 30).map(c => ({
          author: c.author,
          text: stripHtml(c.text),
        }))
      }

      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const text = await res.text()
      if (!res.ok) {
        summaryError = text
      } else {
        summaryText = text
        saveSummary(itemId, text)
        setExpanded(itemId, true)
      }
    } catch {
      summaryError = 'Failed to generate summary.'
    }
    summaryLoading = false
  }
</script>

{#if loading}
  <p class="loading">Loading...</p>
{:else if flagged}
  <p class="flagged">This item has been flagged or removed.</p>
{:else}
  <header class="story-header">
    <div class="story-text">
      <h1 class="story-title">
        {#if url}
          <a href={url} target="_blank" rel="noopener">{title}</a>
        {:else}
          {title}
        {/if}
      </h1>
      <div class="story-meta">
        {score} points |
        {#if isHn}
          <a href="/user/{author}" class="author">{author}</a>
        {:else}
          <span class="author">{author}</span>
        {/if}
        | {timeAgo(timestamp)} | {commentCount} comments
        {#if domain}
          | {domain}
        {/if}
        {#if tags.length > 0}
          | <span class="tags">{tags.join(', ')}</span>
        {/if}
      </div>
    </div>
    <div class="header-actions">
      <button class="ai-btn" onclick={toggleSummary} title="AI summary" disabled={summaryLoading}>✦</button>
      <SaveButton {itemId} />
      {#if url}
        <a href={url} target="_blank" rel="noopener" class="open-link" title="Open link">↗</a>
      {/if}
    </div>
  </header>

  {#if hasSummary}
    <div class="summary-panel">
      <button class="summary-header" onclick={() => { summaryExpanded = !summaryExpanded; setExpanded(itemId, summaryExpanded) }}>
        <span class="summary-label">AI Summary {summaryExpanded ? '▾' : '▸'}</span>
        <div class="summary-actions" onclick={(e) => e.stopPropagation()}>
          {#if summaryText && !summaryLoading}
            <button class="summary-copy" onclick={copySummary}>{summaryCopied ? 'Copied!' : 'Copy'}</button>
            <button class="summary-regen" onclick={fetchSummary}>Regenerate</button>
            <button class="summary-dismiss" onclick={() => { clearSummary(itemId); summaryText = ''; summaryError = ''; summaryExpanded = false }}>Dismiss</button>
          {/if}
        </div>
      </button>
      {#if summaryLoading}
        <div class="summary-loading">
          <span class="summary-spinner">✦</span>
        </div>
      {/if}
      {#if summaryExpanded}
        <div class="summary-body">
          {#if summaryError}
            <p class="summary-error">{summaryError}</p>
          {:else if summaryText}
            {@html marked(summaryText)}
          {/if}
        </div>
      {/if}
    </div>
  {/if}

  {#if bodyText}
    <div class="story-body-wrapper">
      <div class="story-body">{@html bodyText}</div>
      <button class="post-copy-btn" onclick={copyPost} title="Copy post text and link">
        {postCopied ? '✓' : '⧉'}
      </button>
    </div>
  {/if}

  {#if focusStack.length > 0}
    <div class="focus-breadcrumb">
      <button onclick={unfocus}>&larr; Back</button>
      <span class="focus-label">Focused ({focusStack.length} deep)</span>
    </div>
  {/if}

  <section class="comments-section">
    {#if displayedComments.length > 0}
      {#key refreshKey}
        <CommentTree
          comments={displayedComments}
          focusPath={focusStack}
          onfocus={focusComment}
        />
      {/key}
    {:else}
      <p class="no-comments">No comments.</p>
    {/if}
  </section>
{/if}

<style>
  .loading {
    color: var(--color-text-muted);
    padding: 16px 0;
  }

  .story-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--color-border);
    margin-bottom: 12px;
  }

  .story-text {
    min-width: 0;
  }

  .story-title {
    font-size: 1rem;
    font-weight: 600;
    line-height: 1.35;
    margin-bottom: 2px;
  }

  .story-title a {
    color: var(--color-text);
  }

  .story-title a:hover {
    color: var(--color-accent);
  }

  .story-meta {
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }

  .story-meta .author {
    color: var(--color-text-muted);
    text-decoration: none;
  }

  .story-meta .author:hover {
    color: var(--color-accent);
  }

  .story-body-wrapper {
    position: relative;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--color-border);
    margin-bottom: 12px;
  }

  .post-copy-btn {
    position: absolute;
    top: 0;
    right: 0;
    font-size: 1.15rem;
    color: var(--color-text-faint);
    opacity: 0;
    transition: opacity 0.15s;
    padding: 2px;
  }

  .story-body-wrapper:hover .post-copy-btn {
    opacity: 1;
  }

  .post-copy-btn:hover {
    color: var(--color-accent);
  }

  .story-body {
    font-size: 0.95rem;
    line-height: 1.5;
    color: var(--color-text);
    overflow-wrap: break-word;
  }

  .story-body :global(a) {
    color: var(--color-link);
    text-decoration: underline;
  }

  .story-body :global(a:hover) {
    color: var(--color-accent);
  }

  .story-body :global(p) {
    margin-bottom: 6px;
  }

  .story-body :global(pre + p),
  .story-body :global(pre + *) {
    margin-top: 10px;
  }

  .story-body :global(pre) {
    background: var(--color-surface);
    padding: 8px;
    overflow-x: auto;
    font-family: var(--font-mono);
    font-size: 0.8rem;
    border: 1px solid var(--color-border);
    scrollbar-width: thin;
    scrollbar-color: var(--color-border) transparent;
  }

  .story-body :global(pre::-webkit-scrollbar) {
    height: 6px;
  }

  .story-body :global(pre::-webkit-scrollbar-track) {
    background: transparent;
  }

  .story-body :global(pre::-webkit-scrollbar-thumb) {
    background: var(--color-border);
    border-radius: 3px;
  }

  .story-body :global(pre::-webkit-scrollbar-thumb:hover) {
    background: var(--color-text-faint);
  }

  .focus-breadcrumb {
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding: 0 0 12px 0;
    margin-bottom: 12px;
    border-bottom: 1px solid var(--color-border);
  }

  .focus-breadcrumb button {
    color: var(--color-text-muted);
    font-size: 0.8rem;
  }

  .focus-breadcrumb button:hover {
    color: var(--color-text);
  }

  .focus-label {
    font-size: 0.75rem;
    color: var(--color-text-faint);
  }

  .ai-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
    width: 28px;
    height: 28px;
    color: var(--color-text-faint);
  }

  .ai-btn:hover:not(:disabled) {
    color: var(--color-accent);
  }

  .ai-btn:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .summary-panel {
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    padding: 12px;
    margin-bottom: 12px;
  }

  .summary-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    text-align: left;
  }

  .summary-label:hover {
    color: var(--color-text);
  }

  .summary-panel:has(.summary-body) .summary-header {
    margin-bottom: 8px;
  }

  .summary-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .summary-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .summary-copy,
  .summary-regen {
    font-size: 0.7rem;
    color: var(--color-text-faint);
    padding: 2px 6px;
    border: 1px solid var(--color-border);
  }

  .summary-copy:hover,
  .summary-regen:hover {
    color: var(--color-text);
    border-color: var(--color-text-faint);
  }

  .summary-dismiss {
    font-size: 0.7rem;
    color: var(--color-text-faint);
    padding: 2px 6px;
    border: 1px solid var(--color-border);
  }

  .summary-dismiss:hover {
    color: var(--color-danger);
    border-color: var(--color-danger);
  }

  .summary-body {
    font-size: 0.9rem;
    line-height: 1.6;
    color: var(--color-text);
  }

  .summary-body :global(h2),
  .summary-body :global(h3) {
    font-size: 0.9rem;
    font-weight: 600;
    margin-top: 10px;
    margin-bottom: 4px;
  }

  .summary-body :global(p) {
    margin-bottom: 6px;
  }

  .summary-body :global(ul),
  .summary-body :global(ol) {
    padding-left: 20px;
    margin-bottom: 6px;
  }

  .summary-body :global(li) {
    margin-bottom: 4px;
  }

  .summary-body :global(strong) {
    font-weight: 600;
  }

  .summary-body :global(a) {
    color: var(--color-link);
    text-decoration: underline;
  }

  .summary-body :global(a:hover) {
    color: var(--color-accent);
  }

  .summary-body :global(code) {
    font-family: var(--font-mono);
    font-size: 0.85em;
    background: var(--color-surface-hover);
    padding: 1px 4px;
  }

  .summary-error {
    color: var(--color-danger);
  }

  .summary-loading {
    display: flex;
    justify-content: center;
    padding: 20px 0;
  }

  .summary-spinner {
    display: inline-block;
    font-size: 1.4rem;
    color: var(--color-accent);
    animation: spin 1.5s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .header-actions {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    height: 100%;
  }

  .open-link {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.85rem;
    width: 28px;
    height: 28px;
    color: var(--color-text-faint);
    text-decoration: none;
  }

  .open-link:hover {
    color: var(--color-accent);
  }

  .flagged {
    color: var(--color-text-muted);
    padding: 16px 0;
  }

  .no-comments {
    color: var(--color-text-faint);
    padding: 16px 0;
  }

  .tags {
    color: var(--color-text-faint);
    font-size: 0.75rem;
  }
</style>
