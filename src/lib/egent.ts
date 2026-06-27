import { config } from './config'

/**
 * Client for the egent-lobehub agent runtime (`/v1/*`) behind the auth edge.
 * Always sends the session cookie so the edge can inject identity; never sends
 * a user id. Streaming responses use SSE — the chat UI uses the AI SDK transport
 * (see chat-view) which points at `${edgeUrl}/v1/chat/...`.
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
    return (await res.json()) as T
  },
  /** Endpoint used by the chat transport for streaming completions. */
  chatStreamUrl: `${config.edgeUrl}/v1/chat/send`,
}
