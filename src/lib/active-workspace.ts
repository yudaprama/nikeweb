import { useSyncExternalStore } from 'react'

/**
 * The active workspace (sent as `X-Workspace-Id` on every pREST call). For the
 * header, `null` = personal scope (rows with `workspace_id IS NULL`). Standalone
 * module so `prest.ts` can read it without importing the workspaces data layer.
 *
 * Storage distinguishes three states so a new (workspace-first) user can be
 * auto-landed in their default workspace without overriding an explicit choice:
 *   - key absent  → never chosen  → `isWorkspaceChosen()` false (auto-select)
 *   - "personal"  → chose personal → header null, but a deliberate choice
 *   - "<wsId>"    → that workspace
 */
const STORAGE_KEY = 'active_workspace_id'
const PERSONAL = 'personal'
const listeners = new Set<() => void>()

function raw(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function getActiveWorkspaceId(): string | null {
  const v = raw()
  return v && v !== PERSONAL ? v : null
}

/** Whether the user has made an explicit scope choice (workspace or personal). */
export function isWorkspaceChosen(): boolean {
  return raw() !== null
}

export function setActiveWorkspace(id: string | null) {
  try {
    localStorage.setItem(STORAGE_KEY, id ?? PERSONAL)
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
