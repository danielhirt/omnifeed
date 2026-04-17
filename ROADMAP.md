# Omnifeed Roadmap

## Next Up

### Mobile Responsiveness
Improve layout and usability on mobile and smaller devices. The current CSS assumes desktop widths. Key areas:
- NavBar: source dropdown + feed tabs + nav links need to collapse or stack on narrow screens
- FeedControls: mode tabs + source chips + filter buttons overflow on small widths
- StoryCard: meta row wraps awkwardly, rank numbers and icons crowd the title
- Item detail: comment threading indentation breaks on narrow viewports
- Touch targets: buttons and links need adequate tap area (44px minimum)

### Multi-Source Filter in Omnifeed
The source filter chips (HN, Lobsters, DEV) currently work as single-select toggles — clicking one filters to that source only, clicking again deselects it back to all. Add multi-select so users can combine sources (e.g., HN + Lobsters without DEV). Active chips stay highlighted, clicking toggles individual sources on/off. When all are deselected, show all sources (same as no filter).

### Deep Comment Focus on Linked Items
When an HN comment link resolves to a comment that's not in the initial 30-root chunk (or is a deep child), the user lands on the story page but the comment isn't focused. To support arbitrary depth, walk the ancestor chain from the linked comment up to the root, fetch each ancestor's children to expand the path, then push the linked comment onto `focusStack`.

### DEV.to URL Routing
`toInternalRoute` only handles HN and Lobsters URLs. DEV.to public URLs are slug-based (`/{username}/{slug-with-id-suffix}`) and need an extra API call to resolve the slug to a numeric article ID before navigation.

### Extract Shared `runClaude` Helper
The `runClaude` spawn pattern is duplicated between `/api/summarize` and `/api/obsidian-save` (~70 lines each). They differ in spawn args, timeout, and parse strategy (first vs last assistant text). Extract to `packages/web/src/lib/claude-runner.ts` as a config-driven helper.

### Omnifeed Clustering / Ordering
Improve how items are grouped and ordered in the unified feed, particularly in Newest mode. Current behavior: all items from all sources sorted strictly by timestamp, which means high-volume sources (DEV.to) dominate the feed with low-quality posts while slower sources (Lobsters) sink to the bottom.

Possible approaches:
- **Round-robin interleaving**: take N items from each source in rotation, preserving each source's native ranking within its slots
- **Source-weighted scoring**: blend timestamp with a per-source weight factor so lower-volume quality sources get proportional representation
- **Deduplication by URL**: cross-source stories linking to the same URL should merge into one entry showing all source badges
- **Minimum representation**: guarantee each source gets at least K items in the first page regardless of timestamps

## Completed

### In-App Link Routing (2026-04-16)
Comment and post bodies that link to other HN/Lobsters items now route inside Omnifeed instead of opening externally. HN comment IDs walk the parent chain to land on the root story.

### Comment Loading Performance (2026-04-16)
Story header now paints before comments fetch (`storyLoading` separated from `commentsLoading`). HN root comments load in chunks of 30 with a "Load more" button; each comment's children lazy-fetch on expand via "Show N replies". Newest/Oldest sort modes auto-load all remaining roots before sorting. For a 1000+ comment thread: ~1045 fetches before render dropped to 30.

### Save to Obsidian (2026-04-14)
Save button dropdown gained a "Save to Obsidian" option that generates an AI summary and writes the post as a vault note via the `/notetaker` skill. Toast notification system tracks the async flow.

### Feed Cache TTL with Stale-While-Revalidate (2026-04-13)
Web-layer cache stores feed items per source/feed with a 5-minute TTL. Stale reads serve from cache and trigger background revalidation.

### Unified Omnifeed (2026-04-12)
Default view merging all sources with Newest/Hottest modes, source filter chips, score-based sorting for hottest, filter/mode state persistence across navigation, loading indicators, source badges, controls layout.

### Multi-Source Aggregator (2026-04-11)
HN + Lobsters + DEV.to source adapters, per-source views with feed tabs, tag navigation, user profiles.

### Core Features
Feed caching, infinite scroll pagination, read history, collections with IndexedDB, AI summaries via Claude, keyboard navigation, dark/light theme, inline HN search via Algolia.
