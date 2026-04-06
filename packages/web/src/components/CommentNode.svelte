<!-- packages/web/src/components/CommentNode.svelte -->
<script lang="ts">
  import type { Comment } from '@hackernews/core'
  import { timeAgo } from '$lib/time'
  import CommentTree from './CommentTree.svelte'

  let {
    comment,
    depth = 0,
    focusPath = [],
    onfocus,
  }: {
    comment: Comment
    depth?: number
    focusPath?: number[]
    onfocus?: (id: number) => void
  } = $props()

  let collapsed = $state(false)

  const depthColors = [
    'var(--color-accent)',
    '#60a5fa',
    '#34d399',
    '#a78bfa',
    '#f472b6',
    '#fb923c',
  ]

  let guideColor = $derived(depthColors[depth % depthColors.length])
  let isFocused = $derived(focusPath.includes(comment.id))
</script>

{#if !comment.deleted && !comment.dead}
  <div class="comment-node" class:focused={isFocused}>
    {#if depth > 0}
      <div class="indent-guide" style="border-color: {guideColor}"></div>
    {/if}
    <div class="comment-content">
      <div class="comment-header">
        <button class="collapse-toggle" onclick={() => (collapsed = !collapsed)}>
          {collapsed ? '▸' : '▾'}
        </button>
        <span class="author">{comment.by}</span>
        <span class="time">{timeAgo(comment.time)}</span>
        {#if onfocus}
          <button class="focus-btn" onclick={() => onfocus(comment.id)} title="Focus this thread">
            ⊕
          </button>
        {/if}
      </div>
      {#if !collapsed}
        <div class="comment-body">{@html comment.text}</div>
        {#if comment.kids?.length}
          <CommentTree
            commentIds={comment.kids}
            depth={depth + 1}
            {focusPath}
            {onfocus}
          />
        {/if}
      {:else}
        <span class="collapsed-hint">
          {comment.kids?.length ?? 0} replies
        </span>
      {/if}
    </div>
  </div>
{/if}

<style>
  .comment-node {
    display: flex;
    gap: var(--space-sm);
    padding-top: var(--space-sm);
  }

  .comment-node.focused {
    background: var(--color-surface-hover);
    border-radius: var(--radius-sm);
  }

  .indent-guide {
    flex-shrink: 0;
    width: 0;
    border-left: 2px solid;
    margin-left: var(--space-sm);
  }

  .comment-content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  .comment-header {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    font-size: 0.8rem;
  }

  .collapse-toggle {
    font-size: 0.75rem;
    color: var(--color-text-faint);
    padding: 0;
    line-height: 1;
  }

  .author {
    color: var(--color-accent);
    font-weight: 500;
  }

  .time {
    color: var(--color-text-faint);
  }

  .focus-btn {
    color: var(--color-text-faint);
    font-size: 0.75rem;
    padding: 0;
    opacity: 0;
    transition: opacity 0.15s;
  }

  .comment-node:hover .focus-btn {
    opacity: 1;
  }

  .comment-body {
    font-size: 0.9rem;
    line-height: 1.6;
    color: var(--color-text);
    overflow-wrap: break-word;
  }

  .comment-body :global(a) {
    color: var(--color-link);
  }

  .comment-body :global(pre) {
    background: var(--color-surface);
    padding: var(--space-sm);
    border-radius: var(--radius-sm);
    overflow-x: auto;
    font-family: var(--font-mono);
    font-size: 0.85rem;
  }

  .comment-body :global(p) {
    margin-bottom: var(--space-sm);
  }

  .collapsed-hint {
    font-size: 0.75rem;
    color: var(--color-text-faint);
    font-style: italic;
  }
</style>
