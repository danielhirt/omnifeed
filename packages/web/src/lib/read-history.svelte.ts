import { browser } from '$app/environment'

const STORAGE_KEY = 'hn-read'
const MAX_ENTRIES = 2000

let readIds = $state<Set<number>>(new Set())
let loaded = false

function ensureLoaded() {
  if (loaded || !browser) return
  loaded = true
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return
  try {
    readIds = new Set(JSON.parse(raw) as number[])
  } catch {
    // ignore corrupt data
  }
}

function persist() {
  if (!browser) return
  const trimmed = [...readIds].slice(-MAX_ENTRIES)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
}

export function isRead(id: number): boolean {
  ensureLoaded()
  return readIds.has(id)
}

export function markRead(id: number): void {
  ensureLoaded()
  if (readIds.has(id)) return
  readIds = new Set([...readIds, id])
  persist()
}
