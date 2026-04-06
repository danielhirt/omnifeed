<script lang="ts">
  import { page } from '$app/state'
  import { HnClient, type Story } from '@hackernews/core'
  import { getCollections, removeFromCollection } from '$lib/collections.svelte'
  import StoryCard from '../../../components/StoryCard.svelte'

  const client = new HnClient()
  const cols = getCollections()

  let stories: Story[] = $state([])
  let loading = $state(true)

  let collectionId = $derived(page.params.id)
  let collection = $derived(cols.value.find((c) => c.id === collectionId))

  $effect(() => {
    if (collection) {
      loadStories(collection.itemIds)
    }
  })

  async function loadStories(ids: number[]) {
    loading = true
    const results = await Promise.all(
      ids.map((id) => client.fetchItem(id))
    )
    stories = results.filter(
      (item): item is Story => item !== null && 'title' in item
    )
    loading = false
  }

  async function handleRemove(itemId: number) {
    await removeFromCollection(collectionId, itemId)
  }
</script>

{#if collection}
  <div class="collection-view">
    <div class="header">
      <div class="color-dot" style="background: {collection.color}"></div>
      <h1>{collection.name}</h1>
      <span class="count">{collection.itemIds.length} items</span>
    </div>

    {#if loading}
      <p class="loading">Loading stories...</p>
    {:else if stories.length === 0}
      <p class="empty">No saved stories in this collection yet.</p>
    {:else}
      {#each stories as story, i (story.id)}
        <div class="saved-story">
          <StoryCard {story} index={i} />
          <button class="remove-btn" onclick={() => handleRemove(story.id)}>Remove</button>
        </div>
      {/each}
    {/if}
  </div>
{:else}
  <p class="not-found">Collection not found.</p>
{/if}

<style>
  .collection-view {
    display: flex;
    flex-direction: column;
  }

  .header {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    padding-bottom: var(--space-lg);
    border-bottom: 1px solid var(--color-border);
    margin-bottom: var(--space-md);
  }

  .color-dot {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  h1 {
    font-size: 1.5rem;
    font-weight: 600;
  }

  .count {
    font-size: 0.85rem;
    color: var(--color-text-faint);
  }

  .loading,
  .empty,
  .not-found {
    color: var(--color-text-muted);
    padding: var(--space-lg) 0;
  }

  .saved-story {
    display: flex;
    align-items: center;
  }

  .saved-story :global(.story-card) {
    flex: 1;
  }

  .remove-btn {
    font-size: 0.8rem;
    color: var(--color-text-faint);
    padding: var(--space-xs) var(--space-sm);
    flex-shrink: 0;
  }

  .remove-btn:hover {
    color: #ef4444;
  }
</style>
