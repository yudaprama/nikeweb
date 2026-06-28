import { useSyncExternalStore } from 'react'

/**
 * The active workspace (sent as `X-Workspace-Id` on every pREST call). `null` =
 * personal scope (rows with `workspace_id IS NULL`). Standalone module so
 * `prest.ts` can read it without importing the workspaces data layer (no cycle).
 */
const STORAGE_KEY = 'active_workspace_id'
const listeners = new Set<() => void>()

export function getActiveWorkspaceId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function setActiveWorkspace(id: string | null) {
  try {
    if (id) localStorage.setItem(STORAGE_KEY, id)
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((l) => l())
}

export function useActiveWorkspaceId(): string | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    getActiveWorkspaceId,
    () => null,
  )
}
