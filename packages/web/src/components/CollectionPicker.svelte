<script lang="ts">
  import type { Collection } from '@hackernews/core'

  let {
    collections,
    itemCollections,
    onselect,
    onclose,
  }: {
    collections: Collection[]
    itemCollections: Collection[]
    onselect: (collectionId: string) => void
    onclose: () => void
  } = $props()

  let memberIds = $derived(new Set(itemCollections.map((c) => c.id)))
</script>

<div class="picker-backdrop" onclick={onclose} role="presentation"></div>
<div class="picker">
  {#each collections as col (col.id)}
    <button
      class="picker-item"
      class:active={memberIds.has(col.id)}
      onclick={() => onselect(col.id)}
    >
      <div class="color-dot" style="background: {col.color}"></div>
      <span>{col.name}</span>
      {#if memberIds.has(col.id)}
        <span class="check">✓</span>
      {/if}
    </button>
  {/each}
</div>

<style>
  .picker-backdrop {
    position: fixed;
    inset: 0;
    z-index: 200;
  }

  .picker {
    position: absolute;
    right: 0;
    top: 100%;
    z-index: 201;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    min-width: 180px;
    padding: var(--space-xs);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  }

  .picker-item {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    width: 100%;
    padding: var(--space-sm);
    border-radius: var(--radius-sm);
    font-size: 0.85rem;
    text-align: left;
  }

  .picker-item:hover {
    background: var(--color-surface-hover);
  }

  .picker-item.active {
    color: var(--color-accent);
  }

  .color-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .check {
    margin-left: auto;
    font-size: 0.75rem;
  }
</style>
