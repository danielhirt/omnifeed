<script lang="ts">
  import { COLLECTION_COLORS, DEFAULT_COLLECTION_ID } from '@hackernews/core'
  import {
    getCollections,
    createCollection,
    deleteCollection,
    renameCollection,
    updateCollectionColor,
  } from '$lib/collections.svelte'

  const cols = getCollections()

  let showCreate = $state(false)
  let newName = $state('')
  let newColor = $state(COLLECTION_COLORS[0])
  let editingId: string | null = $state(null)
  let editName = $state('')
  let confirmDeleteId: string | null = $state(null)

  async function handleCreate() {
    if (!newName.trim()) return
    await createCollection(newName.trim(), newColor)
    newName = ''
    newColor = COLLECTION_COLORS[0]
    showCreate = false
  }

  async function handleDelete(id: string) {
    await deleteCollection(id)
    confirmDeleteId = null
  }

  function startEdit(id: string, name: string) {
    editingId = id
    editName = name
  }

  async function finishEdit(id: string) {
    if (editName.trim()) {
      await renameCollection(id, editName.trim())
    }
    editingId = null
  }
</script>

<div class="collections-page">
  <div class="header">
    <h1>Collections</h1>
    <button class="create-btn" onclick={() => (showCreate = !showCreate)}>
      {showCreate ? 'Cancel' : '+ New Collection'}
    </button>
  </div>

  {#if showCreate}
    <form class="create-form" onsubmit={(e) => { e.preventDefault(); handleCreate() }}>
      <input
        type="text"
        bind:value={newName}
        placeholder="Collection name"
        class="name-input"
      />
      <div class="color-picker">
        {#each COLLECTION_COLORS as color}
          <button
            type="button"
            class="color-swatch"
            class:selected={newColor === color}
            style="background: {color}"
            onclick={() => (newColor = color)}
          ></button>
        {/each}
      </div>
      <button type="submit" class="submit-btn">Create</button>
    </form>
  {/if}

  <div class="collection-list">
    {#each cols.value as col (col.id)}
      <div class="collection-item">
        <div class="color-dot" style="background: {col.color}"></div>
        <div class="collection-info">
          {#if editingId === col.id}
            <input
              type="text"
              bind:value={editName}
              class="edit-input"
              onkeydown={(e) => { if (e.key === 'Enter') finishEdit(col.id); if (e.key === 'Escape') editingId = null; }}
            />
            <button class="action-btn" onclick={() => finishEdit(col.id)}>Save</button>
          {:else}
            <a href="/collections/{col.id}" class="collection-name">{col.name}</a>
            <span class="item-count">{col.itemIds.length} items</span>
          {/if}
        </div>
        <div class="collection-actions">
          {#if col.id !== DEFAULT_COLLECTION_ID}
            <button class="action-btn" onclick={() => startEdit(col.id, col.name)}>Rename</button>
            {#if confirmDeleteId === col.id}
              <button class="action-btn danger" onclick={() => handleDelete(col.id)}>Confirm</button>
              <button class="action-btn" onclick={() => (confirmDeleteId = null)}>Cancel</button>
            {:else}
              <button class="action-btn" onclick={() => (confirmDeleteId = col.id)}>Delete</button>
            {/if}
          {/if}
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .collections-page {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  h1 {
    font-size: 1.5rem;
    font-weight: 600;
  }

  .create-btn {
    padding: var(--space-sm) var(--space-md);
    background: var(--color-accent);
    color: var(--color-bg);
    font-weight: 500;
    border-radius: var(--radius-sm);
    font-size: 0.875rem;
  }

  .create-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    padding: var(--space-md);
    background: var(--color-surface);
    border-radius: var(--radius-md);
  }

  .name-input,
  .edit-input {
    padding: var(--space-sm);
    background: var(--color-bg);
    color: var(--color-text);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    font-family: inherit;
    font-size: 0.9rem;
  }

  .color-picker {
    display: flex;
    gap: var(--space-xs);
  }

  .color-swatch {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 2px solid transparent;
    transition: border-color 0.15s;
  }

  .color-swatch.selected {
    border-color: var(--color-text);
  }

  .submit-btn {
    align-self: flex-start;
    padding: var(--space-sm) var(--space-md);
    background: var(--color-accent);
    color: var(--color-bg);
    font-weight: 500;
    border-radius: var(--radius-sm);
    font-size: 0.875rem;
  }

  .collection-list {
    display: flex;
    flex-direction: column;
  }

  .collection-item {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    padding: var(--space-md);
    border-bottom: 1px solid var(--color-border);
  }

  .color-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .collection-info {
    flex: 1;
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }

  .collection-name {
    font-weight: 500;
    color: var(--color-text);
    text-decoration: none;
  }

  .collection-name:hover {
    color: var(--color-accent);
  }

  .item-count {
    font-size: 0.8rem;
    color: var(--color-text-faint);
  }

  .collection-actions {
    display: flex;
    gap: var(--space-xs);
  }

  .action-btn {
    font-size: 0.8rem;
    color: var(--color-text-muted);
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--radius-sm);
  }

  .action-btn:hover {
    background: var(--color-surface-hover);
  }

  .action-btn.danger {
    color: #ef4444;
  }

  .edit-input {
    width: 200px;
  }
</style>
