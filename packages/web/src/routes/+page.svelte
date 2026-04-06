<script lang="ts">
  import { page } from '$app/state'
  import { FEED_ENDPOINTS, type FeedType } from '@hackernews/core'
  import StoryCard from '../components/StoryCard.svelte'
  import StoryCardSkeleton from '../components/StoryCardSkeleton.svelte'
  import { getKeyboardState } from '$lib/keyboard.svelte'
  import { getFeedState, loadFeed, loadMore } from '$lib/feed.svelte'

  const kb = getKeyboardState()
  const feed = getFeedState()

  let feedType: FeedType = $derived(
    (new URLSearchParams(page.url.search).get('feed') as FeedType) ?? 'top'
  )

  let endpoint = $derived(FEED_ENDPOINTS[feedType])

  $effect(() => {
    loadFeed(endpoint)
  })

  $effect(() => {
    kb.storyIds = feed.stories.map((s) => s.id)
  })
</script>

<svelte:window
  onscroll={() => {
    const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 500
    if (nearBottom && !feed.loading && !feed.loadingMore) {
      loadMore()
    }
  }}
/>

<div class="feed">
  {#if feed.loading}
    {#each Array(10) as _}
      <StoryCardSkeleton />
    {/each}
  {:else}
    {#each feed.stories as story, i}
      <StoryCard {story} index={i} selected={i === kb.selectedIndex} />
    {/each}
    {#if feed.loadingMore}
      {#each Array(5) as _}
        <StoryCardSkeleton />
      {/each}
    {/if}
  {/if}
</div>

<style>
  .feed {
    display: flex;
    flex-direction: column;
  }
</style>
