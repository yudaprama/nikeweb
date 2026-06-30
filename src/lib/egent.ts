import { config } from './config'

/**
 * Generic edge fetcher for non-streaming JSON endpoints behind the Oathkeeper
 * auth edge (always sends the session cookie so the edge can inject identity;
 * never sends a user id). Despite the legacy name, nothing here targets
 * egent-lobehub anymore — callers hit the Talos self-service surface
 * (`/v2alpha1/self/*`) and pREST workspace management (`/v1/workspaces/*`).
 * Chat streaming uses the AI SDK transport (see chat-view) which points at
 * `${agentUrl}/v1/chat/completions`.
 */
async function egentFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${config.edgeUrl}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new EgentError(res.status, body || res.statusText)
  }
  return res
}

export class EgentError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'EgentError'
    this.status = status
  }
}

export const egent = {
  /** Raw fetch for non-streaming JSON endpoints. */
  async json<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await egentFetch(path, init)
    // 204 No Content (or any empty body) cannot be parsed as JSON — return
    // null so callers like useRevokeKey (which hits Talos's
    // /v2alpha1/self/.../:revoke → google.protobuf.Empty → 204) work without
    // a SyntaxError on res.json().
    if (res.status === 204) return null as T
    const text = await res.text()
    if (!text) return null as T
    return JSON.parse(text) as T
  },
}
