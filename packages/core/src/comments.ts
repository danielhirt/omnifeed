import type { Comment, CommentItem, Story } from './models.js'
import type { HnClient } from './client.js'

export function hnCommentToItem(comment: Comment, depth: number): CommentItem {
  return {
    id: `hn:${comment.id}`,
    source: 'hackernews',
    text: comment.text,
    author: comment.by,
    timestamp: comment.time,
    deleted: comment.deleted,
    dead: comment.dead,
    children: [],
    depth,
  }
}

export async function fetchHnCommentTree(
  client: HnClient,
  ids: number[],
  depth = 0,
  maxDepth = 10,
): Promise<CommentItem[]> {
  if (!ids.length || depth > maxDepth) return []

  const results = await Promise.all(ids.map((id) => client.fetchItem(id)))
  const items: CommentItem[] = []

  for (const result of results) {
    if (!result || !('parent' in result)) continue
    const comment = result as Comment
    if (comment.deleted || comment.dead) continue

    const item = hnCommentToItem(comment, depth)
    if (comment.kids?.length) {
      item.children = await fetchHnCommentTree(client, comment.kids, depth + 1, maxDepth)
    }
    items.push(item)
  }

  return items
}

/**
 * Fetches a batch of HN comments WITHOUT recursing into their children.
 * Each returned item has `pendingKidIds` set to the comment's native `kids`
 * array, signalling to the UI that children exist but haven't been loaded.
 *
 * Use this for the initial render of a thread to avoid the unbounded fan-out
 * problem. Lazy-fetch children with `fetchHnCommentChildren` when the user
 * expands a node.
 */
export async function fetchHnCommentBatch(
  client: HnClient,
  ids: number[],
  depth = 0,
): Promise<CommentItem[]> {
  if (!ids.length) return []

  const results = await Promise.all(ids.map((id) => client.fetchItem(id)))
  const items: CommentItem[] = []

  for (const result of results) {
    if (!result || !('parent' in result)) continue
    const comment = result as Comment
    if (comment.deleted || comment.dead) continue

    const item = hnCommentToItem(comment, depth)
    if (comment.kids?.length) {
      item.pendingKidIds = comment.kids
    }
    items.push(item)
  }

  return items
}

/**
 * Lazy-fetches the direct children of a comment that was loaded with
 * `fetchHnCommentBatch`. Returns the children as another batch (their own
 * children are deferred via `pendingKidIds`). Caller is responsible for
 * splicing the result into the parent's `children` and clearing
 * `pendingKidIds`.
 */
export function fetchHnCommentChildren(
  client: HnClient,
  parentDepth: number,
  kidIds: number[],
): Promise<CommentItem[]> {
  return fetchHnCommentBatch(client, kidIds, parentDepth + 1)
}

const MAX_PARENT_WALK = 50

/**
 * Resolve an HN item ID to its root story. HN's /item route is shared between
 * stories and comments — a URL like /item?id=12345 may point to either. When
 * a user follows a link to a comment, we want to load the parent story so the
 * detail page works.
 *
 * If `id` is already a story, returns immediately with `originalCommentId =
 * null`. If it's a comment, walks via `parent` until a story is found and
 * returns the original ID so the caller can focus on that comment in the
 * loaded tree.
 *
 * Returns null if the chain breaks (item missing) or exceeds MAX_PARENT_WALK.
 */
export async function resolveHnRootStory(
  client: HnClient,
  id: number,
): Promise<{ story: Story; originalCommentId: number | null } | null> {
  let originalCommentId: number | null = null
  let currentId = id

  for (let i = 0; i < MAX_PARENT_WALK; i++) {
    const item = await client.fetchItem(currentId)
    if (!item) return null
    if ('title' in item) {
      return { story: item as Story, originalCommentId }
    }
    if (!('parent' in item)) return null
    if (originalCommentId === null) originalCommentId = id
    currentId = (item as Comment).parent
  }
  return null
}
