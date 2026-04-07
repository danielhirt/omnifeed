<script lang="ts">
  import { getSettings, updateSettings, type ModelOption } from '$lib/settings.svelte'

  const settings = getSettings()

  const models: { value: ModelOption; label: string; description: string }[] = [
    { value: 'haiku', label: 'Haiku', description: 'Fastest, good for quick summaries' },
    { value: 'sonnet', label: 'Sonnet', description: 'Balanced speed and quality' },
    { value: 'opus', label: 'Opus', description: 'Most capable, slower' },
  ]
</script>

<div class="settings-page">
  <h1>Settings</h1>

  <section class="setting-group">
    <h2>AI Summary Model</h2>
    <p class="setting-description">Select the Claude model used for AI summaries on item pages.</p>
    <div class="model-options">
      {#each models as model}
        <button
          class="model-option"
          class:active={settings.value.model === model.value}
          onclick={() => updateSettings({ model: model.value })}
        >
          <span class="model-label">{model.label}</span>
          <span class="model-desc">{model.description}</span>
        </button>
      {/each}
    </div>
  </section>
</div>

<style>
  .settings-page {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  h1 {
    font-size: 1.1rem;
    font-weight: 600;
  }

  .setting-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  h2 {
    font-size: 0.9rem;
    font-weight: 600;
  }

  .setting-description {
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }

  .model-options {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .model-option {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 12px;
    border: 1px solid var(--color-border);
    text-align: left;
  }

  .model-option:hover {
    border-color: var(--color-text-faint);
  }

  .model-option.active {
    border-color: var(--color-accent);
  }

  .model-label {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--color-text);
  }

  .model-option.active .model-label {
    color: var(--color-accent);
  }

  .model-desc {
    font-size: 0.75rem;
    color: var(--color-text-muted);
  }
</style>
