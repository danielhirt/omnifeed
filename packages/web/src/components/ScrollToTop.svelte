<script lang="ts">
  import { SCROLL_TO_TOP_THRESHOLD } from '$lib/pagination'

  let visible = $state(false)

  function onScroll() {
    visible = window.scrollY > SCROLL_TO_TOP_THRESHOLD
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
</script>

<svelte:window onscroll={onScroll} />

{#if visible}
  <button class="scroll-to-top" onclick={scrollToTop} aria-label="Scroll to top">
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M8 12V4" />
      <path d="M4 7l4-4 4 4" />
    </svg>
    Top
  </button>
{/if}

<style>
  .scroll-to-top {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--color-bg);
    background: var(--color-text);
    border: none;
    border-radius: 20px;
    cursor: pointer;
    opacity: 0.9;
    z-index: 100;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    transition: opacity 0.15s;
  }

  .scroll-to-top:hover {
    opacity: 1;
  }
</style>
