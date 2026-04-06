<div class="skeleton-card">
  <div class="skeleton-title"></div>
  <div class="skeleton-meta"></div>
</div>

<style>
  .skeleton-card {
    padding: 6px 0;
    border-bottom: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .skeleton-title,
  .skeleton-meta {
    background: var(--color-surface);
  }

  .skeleton-title {
    height: 0.95rem;
    width: 70%;
  }

  .skeleton-meta {
    height: 0.75rem;
    width: 40%;
  }
</style>
