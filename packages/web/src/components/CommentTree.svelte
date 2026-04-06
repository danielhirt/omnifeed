<!-- packages/web/src/components/CommentTree.svelte -->
<script lang="ts">
  import type { Comment } from '@hackernews/core'
  import { HnClient } from '@hackernews/core'
  import CommentNode from './CommentNode.svelte'

  let {
    commentIds,
    depth = 0,
    client,
    focusPath = [],
    onfocus,
  }: {
    commentIds: number[]
    depth?: number
    client?: HnClient
    focusPath?: number[]
    onfocus?: (id: number) => void
  } = $props()

  const hnClient = client ?? new HnClient()

  let comments: Comment[] = $state([])
  let loading = $state(true)

  $effect(() => {
    loadComments(commentIds)
  })

  async function loadComments(ids: number[]) {
    loading = true
    const results = await Promise.all(
      ids.map((id) => hnClient.fetchItem(id))
    )
    comments = results.filter(
      (item): item is Comment => item !== null && 'parent' in item
    )
    loading = false
  }
</script>

<div class="comment-tree">
  {#if loading && depth === 0}
    <p class="loading">Loading comments...</p>
  {:else}
    {#each comments as comment (comment.id)}
      <CommentNode
        {comment}
        {depth}
        {focusPath}
        {onfocus}
      />
    {/each}
  {/if}
</div>

<style>
  .comment-tree {
    display: flex;
    flex-direction: column;
  }

  .loading {
    color: var(--color-text-muted);
    font-size: 0.875rem;
    padding: var(--space-md) 0;
  }
</style>
