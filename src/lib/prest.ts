import { config } from './config'
import { getActiveWorkspaceId } from './active-workspace'

/**
 * Thin client for pREST (flat CRUD + joined reads) behind the auth edge.
 * The edge scopes every row to the logged-in user — never send a user_id in
 * filters or bodies. The active workspace is auto-attached as X-Workspace-Id;
 * the edge authorizes it (Keto) and pREST scopes content tables to it.
 */
// pREST connection name (the first URL path segment), NOT a Postgres db name.
// Must be 'kawai' — selects the registered `kawai` connection (PREST_PG_URL_KAWAI)
// AND matches `filter.Database == "kawai"` so pREST applies the user_id /
// workspace read-scope and the write-side user_id injection.
const DB = 'kawai'
const SCHEMA = 'public'

function headers(workspaceId?: string | null): HeadersInit {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (workspaceId) h['X-Workspace-Id'] = workspaceId
  return h
}

async function req<T>(
  path: string,
  init: RequestInit,
  workspaceId: string | null = getActiveWorkspaceId(),
): Promise<T> {
  const res = await fetch(`${config.edgeUrl}${path}`, {
    ...init,
    credentials: 'include',
    headers: { ...headers(workspaceId), ...(init.headers ?? {}) },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`pREST ${res.status}: ${body || res.statusText}`)
  }
  return (await res.json()) as T
}

export const prest = {
  // Pass `workspaceId` to override the active workspace; `null` forces personal
  // scope; omit (undefined) to auto-use the active workspace.
  /** GET /{db}/{schema}/{table} with optional query string. */
  list<T>(table: string, query = '', workspaceId?: string | null): Promise<T[]> {
    const qs = query ? `?${query}` : ''
    return req<T[]>(`/${DB}/${SCHEMA}/${table}${qs}`, { method: 'GET' }, workspaceId)
  },
  insert<T>(table: string, row: Record<string, unknown>, workspaceId?: string | null): Promise<T> {
    return req<T>(`/${DB}/${SCHEMA}/${table}`, { method: 'POST', body: JSON.stringify(row) }, workspaceId)
  },
  update<T>(table: string, query: string, patch: Record<string, unknown>, workspaceId?: string | null): Promise<T> {
    return req<T>(`/${DB}/${SCHEMA}/${table}?${query}`, { method: 'PATCH', body: JSON.stringify(patch) }, workspaceId)
  },
  remove(table: string, query: string, workspaceId?: string | null): Promise<unknown> {
    return req(`/${DB}/${SCHEMA}/${table}?${query}`, { method: 'DELETE' }, workspaceId)
  },
}
