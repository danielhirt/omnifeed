<!-- packages/web/src/routes/item/[id]/+page.svelte -->
<script lang="ts">
  import { page } from '$app/state'
  import { HnClient, type Story, type Comment as HnComment } from '@hackernews/core'
  import { timeAgo, domainFrom } from '$lib/time'
  import CommentTree from '../../../components/CommentTree.svelte'

  const client = new HnClient()

  let story: Story | null = $state(null)
  let loading = $state(true)
  let focusStack: number[] = $state([])
  let focusedCommentIds: number[] = $state([])

  let itemId = $derived(Number(page.params.id))
  let domain = $derived(story ? domainFrom(story.url) : '')

  $effect(() => {
    loadStory(itemId)
  })

  async function loadStory(id: number) {
    loading = true
    focusStack = []
    focusedCommentIds = []
    const item = await client.fetchItem(id)
    if (item && 'title' in item) {
      story = item as Story
    }
    loading = false
  }

  function focusComment(commentId: number) {
    focusStack = [...focusStack, commentId]
    focusedCommentIds = [commentId]
  }

  function unfocus() {
    focusStack = focusStack.slice(0, -1)
    focusedCommentIds = focusStack.length > 0 ? [focusStack[focusStack.length - 1]] : []
  }

  let displayedCommentIds = $derived(
    focusedCommentIds.length > 0 ? focusedCommentIds : (story?.kids ?? [])
  )
</script>

{#if loading}
  <p class="loading">Loading...</p>
{:else if story}
  <header class="story-header">
    <h1 class="story-title">
      {#if story.url}
        <a href={story.url} target="_blank" rel="noopener">{story.title}</a>
      {:else}
        {story.title}
      {/if}
    </h1>
    {#if domain}
      <span class="domain">{domain}</span>
    {/if}
    <div class="story-meta">
      <span class="score">{story.score} points</span>
      <span class="sep">&middot;</span>
      <span>{story.by}</span>
      <span class="sep">&middot;</span>
      <span>{timeAgo(story.time)}</span>
      <span class="sep">&middot;</span>
      <span>{story.descendants ?? 0} comments</span>
    </div>
  </header>

  {#if focusStack.length > 0}
    <div class="focus-breadcrumb">
      <button onclick={unfocus}>← Back</button>
      <span class="focus-label">Focused thread ({focusStack.length} deep)</span>
    </div>
  {/if}

  <section class="comments-section">
    {#if displayedCommentIds.length > 0}
      <CommentTree
        commentIds={displayedCommentIds}
        {client}
        focusPath={focusStack}
        onfocus={focusComment}
      />
    {:else}
      <p class="no-comments">No comments yet.</p>
    {/if}
  </section>
{/if}

<style>
  .loading {
    color: var(--color-text-muted);
    padding: var(--space-lg);
  }

  .story-header {
    padding-bottom: var(--space-lg);
    border-bottom: 1px solid var(--color-border);
    margin-bottom: var(--space-lg);
  }

  .story-title {
    font-size: 1.5rem;
    font-weight: 600;
    line-height: 1.3;
    margin-bottom: var(--space-xs);
  }

  .story-title a {
    color: var(--color-text);
  }

  .story-title a:hover {
    color: var(--color-accent);
  }

  .domain {
    font-size: 0.85rem;
    color: var(--color-text-faint);
  }

  .story-meta {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    font-size: 0.85rem;
    color: var(--color-text-muted);
    margin-top: var(--space-sm);
  }

  .score {
    color: var(--color-accent);
  }

  .sep {
    color: var(--color-text-faint);
  }

  .focus-breadcrumb {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-sm) var(--space-md);
    background: var(--color-surface);
    border-radius: var(--radius-sm);
    margin-bottom: var(--space-md);
  }

  .focus-breadcrumb button {
    color: var(--color-link);
    font-size: 0.85rem;
  }

  .focus-breadcrumb button:hover {
    color: var(--color-link-hover);
  }

  .focus-label {
    font-size: 0.8rem;
    color: var(--color-text-faint);
  }

  .no-comments {
    color: var(--color-text-faint);
    font-style: italic;
  }
</style>
