# Omnifeed

## Project Overview

A multi-source news aggregator (HN, Lobsters, DEV.to) with a unified "omnifeed" that merges all sources into one chronological or score-ranked stream. Built as a pnpm monorepo:

- **`packages/core`** — TypeScript library: API clients, data models, feed pagination, caching, `mergeFeeds` pure function for cross-source aggregation
- **`packages/web`** — SvelteKit 5 frontend: unified omnifeed, per-source views, story detail, collections, AI summaries

## Tech Stack

- **Framework**: Svelte 5 (runes: `$state`, `$derived`, `$effect`, `$props`) + SvelteKit 2
- **Bundler**: Vite 7
- **Styling**: Scoped CSS with CSS variables (dark/light theme via `--color-*` tokens in `app.css`)
- **Storage**: localStorage (summaries, settings, read history), IndexedDB via `idb` (collections)
- **Testing**: Vitest + `@testing-library/svelte` + jsdom
- **Markdown**: `marked` for rendering AI summaries

## Commands

```bash
# From packages/web:
pnpm dev          # Start dev server
pnpm test         # Run tests (vitest run)
pnpm test:watch   # Watch mode
pnpm build        # Production build
pnpm check        # Svelte + TypeScript checking
```

## Architecture

### Unified Omnifeed

The default view (`/` with no `?source` param) merges items from all sources. Key files:

- **`packages/core/src/omnifeed.ts`** — `mergeFeeds(feedsBySource, sort)` pure function, `OmnifeedMode` (`'newest'|'hottest'`), `FeedView` (`ContentSource|'omnifeed'`), `OMNIFEED_MAP` (maps modes to per-source sub-feeds)
- **`packages/web/src/lib/feed.svelte.ts`** — `loadOmnifeed(mode)` parallel-fetches all sources via `fetchAllSources` helper, `loadMore` omnifeed branch with deduplication
- **`packages/web/src/components/FeedControls.svelte`** — mode tabs (Newest/Hottest) + source filter chips (HN/Lobsters/DEV) on left, All/Unread/Saved + refresh on right

State persistence: `omnifeedMode`, `sourceFilter`, and `feedFilter` live in the feed store (module-level `$state`) so they survive SvelteKit page remounts. The page's reset `$effect` uses a `mounted` flag to skip the initial run + a `viewKey` derived string to only reset on actual view changes.

NavBar detects omnifeed mode via `feed.view === 'omnifeed'` on non-feed routes, showing "Omnifeed ▾" dropdown when the user came from the unified view.

### State Management

Svelte 5 reactive stores in `$lib/*.svelte.ts` files — no external state library. Each store uses lazy initialization from localStorage/IndexedDB with `ensureLoaded()` pattern.

### AI Summary System

- **Trigger**: `✦` button on feed cards and item detail page
- **Endpoint**: `POST /api/summarize` — accepts `{ storyId, model }`
- **Backend**: Spawns `claude` CLI in isolated mode (`--tools ''`, `--system-prompt`, `--output-format stream-json`, `cwd: /tmp`) to avoid project config/hooks leaking into output. Parses stream-json to extract first assistant text response only.
- **Caching**: LRU cache in localStorage (max 100 entries) via `$lib/summaries.svelte.ts`
- **Models**: haiku, sonnet (default), opus — configurable in settings

### Save to Obsidian

The save button (`○`/`●`) on the item detail page opens a CollectionPicker dropdown. The first row, separated by a divider, is "Save to Obsidian". Flow:

1. Generate the AI summary (or read it from cache).
2. POST to `/api/obsidian-save` with `{ title, url, bodyText, summary, source, author, tags }`.
3. The endpoint shells out to the `claude` CLI with `--allowedTools Bash,Read,Write,Edit,Glob,Grep` and a 120s timeout, prompting it to invoke the `/notetaker` skill. Default vault location: `008 Resources/Omnifeed/`.
4. Toast notifications track the flow: `Saving to Obsidian...` → `Writing to Obsidian...` → `Saved to Obsidian` (auto-dismisses after 3s).

Files: `packages/web/src/lib/toast.svelte.ts`, `packages/web/src/components/Toast.svelte`, `packages/web/src/routes/api/obsidian-save/+server.ts`. The `runClaude` spawn pattern is duplicated from `/api/summarize`; a follow-up extracts it to `packages/web/src/lib/claude-runner.ts`.

### Toast Notifications

`packages/web/src/lib/toast.svelte.ts` exposes `showToast(message, status?)`, `updateToast(id, message, status?)`, `dismissToast()`. One toast at a time. Loading status shows a spinning `✦`, success auto-dismisses after 3s, error persists with a dismiss button. Mounted globally in `+layout.svelte`. Positioned at `bottom: 72px` to clear the ScrollToTop button.

### Item Detail Render Pipeline

The page splits loading into two reactive states:
- `storyLoading`: gates the top-level "Loading..." placeholder. Flips false the moment story metadata is set.
- `commentsLoading`: shows "Loading comments..." inside the comments section while the tree fetches.

For DEV.to, the article and comments race independently (no `Promise.all`) so the article paints first if it lands first. For HN, story populates before comment fetching begins.

### HN Comment Loading (Chunked + Lazy)

The original `fetchHnCommentTree` recursed unbounded depth, issuing thousands of parallel HN Firebase requests for large threads. Replaced on the page with two non-recursive functions in `packages/core/src/comments.ts`:

- `fetchHnCommentBatch(client, ids, depth)`: fetches the requested IDs in one parallel pass, populates `pendingKidIds` from each comment's `kids` array. Does not descend.
- `fetchHnCommentChildren(client, parentDepth, kidIds)`: wraps the batch fetcher with `depth = parentDepth + 1`. Used for one-level lazy expansion.

Page behavior:
- Initial HN load: first 30 root comments, no children fetched.
- "Load 30 more comments (N remaining)" button below the tree paginates additional roots.
- Each `CommentNode` with `pendingKidIds.length > 0` renders an inline "Show N replies" button. Click triggers `loadChildren(targetId)` on the page, which fetches direct children, splices them into the node, and reassigns `comments` for Svelte 5 reactivity.
- Sort modes (Newest/Oldest) auto-load all remaining roots via a `$effect` watching `commentSort`, since sorting only the loaded subset would be misleading. Default mode preserves HN's chunked ranking.

`CommentItem.pendingKidIds?: number[]` is the shared signal between core and the UI for "children exist but haven't been fetched."

### In-App Link Routing

Links inside comment and post bodies that point to other Omnifeed-supported items get rewritten to internal routes, so they navigate inside the app instead of opening externally.

- `packages/core/src/links.ts`: `toInternalRoute(url)` matches `news.ycombinator.com/item?id=N` → `/item/hn:N` and `lobste.rs/s/SHORTID` → `/item/lo:SHORTID`. Pure string parsing, returns null for unsupported URLs.
- `packages/web/src/lib/internal-links.ts`: `rewriteInternalLinks(html)` walks anchor tags via `DOMParser`, swaps qualifying hrefs, preserves the original in `data-original-href`, strips `target`/`rel` so navigation stays in-tab. Browser-only; SSR pass-through.

Applied in `CommentNode.svelte` (comment body) and `+page.svelte` (story body) after `sanitizeHtml`.

HN's `/item` route serves stories AND comments. `resolveHnRootStory(client, id)` walks the parent chain (cap of 50 hops) when the requested item is a comment, returns the root story plus the original comment ID. The page replaces the address bar with the resolved story ID via `history.replaceState`. If the original comment is in the initial 30-root chunk, focus mode auto-scopes to it; deeper comments require ancestor-chain fetching (deferred).

DEV.to URLs aren't supported yet (slug-based, would need API resolution).

### Feed Story Cards

Each `StoryCard.svelte` has an expandable panel with:
- **OP Comment**: Shows `story.text` if present, with preview/expand/collapse controls
- **AI Summary**: Triggered via `✦` button, displayed below OP text with its own expand controls, loading spinner, regenerate/dismiss actions
- Sections are labeled ("OP COMMENT", "AI SUMMARY") and separated by a divider only when both are present

### Component Testing

Component tests use `@testing-library/svelte` with jsdom. The vite config needs `resolve.conditions: ['browser']` to force Svelte's client build in test environment.

## Verification

After code changes, run this verification sequence:

```bash
# 1. Unit tests + type check (always)
pnpm test && pnpm check

# 2. Browser walkthrough (after features or large changes)
# Use playwright-cli to interactively verify the app
playwright-cli open http://localhost:5173

# 3. Automated regression suite (optional, for broad changes)
python3 scripts/test_regression.py
```

### Browser walkthrough with playwright-cli

Use `playwright-cli` for interactive browser verification after significant changes. The dev server must be running on `:5173`. Walk through this checklist:

1. **Omnifeed default**: `/` loads unified feed with items from multiple sources, source badges visible
2. **Mode switching**: click Hottest, verify items re-sort by score. Click Newest, verify chronological
3. **Source filter chips**: click HN/Lobsters/DEV, verify items filter. Click active chip to deselect
4. **Filter persistence**: set Hottest + Lobsters, click item, click ← Back, verify both persist
5. **NavBar context**: on item detail from omnifeed, dropdown shows "Omnifeed ▾". From HN view, shows "HN ▾"
6. **Source dropdown**: open dropdown, verify Omnifeed is first item, click a source, verify per-source view
7. **Per-source feed tabs**: on `/?source=hackernews`, verify Top/New/Best/Ask/Show/Jobs tabs
8. **Tag navigation** (Lobsters): click a tag pill, verify tag header + back button, click back
9. **Search** (HN per-source only): type query, submit, verify results, clear. Hidden in omnifeed mode
10. **Collections / Settings**: navigate to each, verify they render
11. **Theme toggle**: click sun/moon icon, verify `data-theme` changes on `:root`
12. **Keyboard nav**: set `hn-settings` with `keyboardNav: true` via `localstorage-set`, reload, test j/k/o
13. **Infinite scroll**: scroll to bottom, verify loading pill appears, new items load
14. **Console errors**: run `playwright-cli console error`, verify 0 errors

Key commands:
```bash
playwright-cli open http://localhost:5173       # open browser
playwright-cli snapshot --depth=3 "main"        # inspect DOM
playwright-cli click ".story-card >> nth=0"     # click first story
playwright-cli eval "document.querySelector('.tab.active')?.textContent"
playwright-cli localstorage-set hn-settings '{"keyboardNav":true}'
playwright-cli console error                    # check for errors
playwright-cli screenshot                       # visual capture
playwright-cli close                            # done
```

### Automated regression suite

`scripts/test_regression.py` is a headless Playwright Python script that automates the walkthrough above. Run it for broad changes or as a CI gate. Screenshots go to `/tmp/regression_*.png`.

### Known test caveats

- **HN API latency**: User profile loading depends on the HN Firebase API. Tests use generous timeouts but may warn on slow responses.
- **Settings storage key**: The localStorage key is `hn-settings` (legacy name, not yet renamed to match the Omnifeed rebrand).
- **Search pagination**: Algolia may return results that fit on a single page, so pagination presence is a warning, not an error.

## Conventions

- Unicode icons for actions: `▸/▾` (expand/collapse), `✦` (AI), `○/●` (save), `↗` (external link)
- Faint → muted → accent color progression for interactive element states
- Custom thin scrollbars matching theme via `scrollbar-width: thin` + `::-webkit-scrollbar`
