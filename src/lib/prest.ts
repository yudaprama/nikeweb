import { config } from './config'

/**
 * Thin client for pREST (flat CRUD + joined reads) behind the auth edge.
 * The edge scopes every row to the logged-in user — never send a user_id in
 * filters or bodies. Send X-Workspace-Id for content tables when a workspace
 * is active (the backend filters by active workspace).
 */
// pREST connection name (the first URL path segment), NOT a Postgres db name.
// Must be 'lobehub' — that selects the registered lobehub connection AND matches
// `filter.Database == "lobehub"` so pREST applies the user_id / workspace
// read-scope and the write-side user_id injection.
const DB = 'lobehub'
const SCHEMA = 'public'

function headers(workspaceId?: string): HeadersInit {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (workspaceId) h['X-Workspace-Id'] = workspaceId
  return h
}

async function req<T>(path: string, init: RequestInit, workspaceId?: string): Promise<T> {
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
  /** GET /{db}/{schema}/{table} with optional query string. */
  list<T>(table: string, query = '', workspaceId?: string): Promise<T[]> {
    const qs = query ? `?${query}` : ''
    return req<T[]>(`/${DB}/${SCHEMA}/${table}${qs}`, { method: 'GET' }, workspaceId)
  },
  insert<T>(table: string, row: Record<string, unknown>, workspaceId?: string): Promise<T> {
    return req<T>(`/${DB}/${SCHEMA}/${table}`, { method: 'POST', body: JSON.stringify(row) }, workspaceId)
  },
  update<T>(table: string, query: string, patch: Record<string, unknown>, workspaceId?: string): Promise<T> {
    return req<T>(`/${DB}/${SCHEMA}/${table}?${query}`, { method: 'PATCH', body: JSON.stringify(patch) }, workspaceId)
  },
  remove(table: string, query: string, workspaceId?: string): Promise<unknown> {
    return req(`/${DB}/${SCHEMA}/${table}?${query}`, { method: 'DELETE' }, workspaceId)
  },
}
