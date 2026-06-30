import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { config } from './config'

/**
 * Client for MuninnDB cognitive memory, reached DIRECTLY through the auth edge
 * at `${edgeUrl}/.muninn/api/*` — no egent-lobehub hop. Oathkeeper injects the
 * Kratos identity as `X-User-Id`, which MuninnDB (running in edge auth mode,
 * MUNINN_TRUST_EDGE_HEADER=X-User-Id) uses as the vault. One vault per user,
 * exactly like pREST scopes rows by user_id — so the browser never sends a vault
 * name and cannot read anyone else's memories.
 *
 * Embedding happens server-side in MuninnDB, so we send plain text (the query
 * terms / concept+content), never vectors.
 */
async function muninnFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${config.edgeUrl}/.muninn${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new MuninnError(res.status, body || res.statusText)
  }
  return res
}

export class MuninnError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'MuninnError'
    this.status = status
  }
}

/** A single activated engram returned by recall (subset of MuninnDB's ActivationItem). */
export interface Recollection {
  id: string
  concept: string
  content: string
  summary?: string
  score: number
  why?: string
  created_at?: number
}

interface ActivateResponse {
  query_id: string
  total_found: number
  activations: Recollection[]
}

interface WriteResponse {
  id: string
  created_at: number
}

/** A stored engram as returned by the list endpoint (MuninnDB EngramItem). */
export interface Engram {
  id: string
  concept: string
  content: string
  confidence: number
  tags?: string[]
  created_at: number
}

interface ListEngramsResponse {
  engrams: Engram[]
  total: number
}

export const muninn = {
  /** Semantic recall: returns engrams relevant to the query terms. */
  async recall(query: string, maxResults = 10): Promise<Recollection[]> {
    const res = await muninnFetch('/api/activate', {
      method: 'POST',
      body: JSON.stringify({ context: [query], max_results: maxResults }),
    })
    const data = (await res.json()) as ActivateResponse
    return data.activations ?? []
  },

  /** Store a new memory. `concept` is the short label, `content` the body. */
  async remember(concept: string, content: string, tags?: string[]): Promise<string> {
    const res = await muninnFetch('/api/engrams', {
      method: 'POST',
      body: JSON.stringify({ concept, content, tags }),
    })
    const data = (await res.json()) as WriteResponse
    return data.id
  },

  /** Permanently delete a memory by id. */
  async forget(id: string): Promise<void> {
    await muninnFetch(`/api/engrams/${encodeURIComponent(id)}`, { method: 'DELETE' })
  },

  /** List stored memories (most recent first), for the Memory view. */
  async list(limit = 100): Promise<Engram[]> {
    const res = await muninnFetch(`/api/engrams?limit=${limit}&sort=created`)
    const data = (await res.json()) as ListEngramsResponse
    return data.engrams ?? []
  },
}

/** Recall hook — disabled until a non-empty query is supplied. */
export function useRecall(query: string, maxResults = 10) {
  const trimmed = query.trim()
  return useQuery({
    queryKey: ['muninn', 'recall', trimmed, maxResults],
    queryFn: () => muninn.recall(trimmed, maxResults),
    enabled: trimmed.length > 0,
  })
}

export function useRemember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { concept: string; content: string; tags?: string[] }) =>
      muninn.remember(input.concept, input.content, input.tags),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['muninn', 'recall'] })
      qc.invalidateQueries({ queryKey: ['muninn', 'list'] })
    },
  })
}

/** Lists all stored memories (for the Memory view when no search query). */
export function useMemories(limit = 100) {
  return useQuery({
    queryKey: ['muninn', 'list', limit],
    queryFn: () => muninn.list(limit),
  })
}

export function useForget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => muninn.forget(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['muninn', 'recall'] })
      qc.invalidateQueries({ queryKey: ['muninn', 'list'] })
    },
  })
}
