import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'
import { egent } from './egent'

/**
 * Per-user Plano API keys. The user mints their OWN key (bound to their identity
 * as the Talos actor) through the egent edge (cookie-authenticated), then the
 * chat sends it as `Authorization: Bearer <key>` directly to Plano's
 * CORS-enabled model proxy. A leaked key only spends that one user's quota.
 */
export interface ApiKeyInfo {
  key_id: string
  name: string
  actor_id: string
  status: string
  create_time: string
  expire_time: string
}

interface IssuedKey {
  keyId: string
  name: string
  secret: string
  expireTime: string
}

/** Lists the signed-in user's API keys (secrets are never returned by list). */
export function useKeys() {
  return useQuery({
    queryKey: ['api-keys'],
    queryFn: () => egent.json<{ keys: ApiKeyInfo[] }>('/v1/keys').then((r) => r.keys ?? []),
  })
}

/** Issues a new key and auto-activates it for the chat (secret shown once). */
export function useCreateKey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name?: string) =>
      egent.json<IssuedKey>('/v1/keys', {
        method: 'POST',
        body: JSON.stringify({ name: name || 'web-app' }),
      }),
    onSuccess: (data) => {
      setActiveKey({ secret: data.secret, keyId: data.keyId, name: data.name })
      qc.invalidateQueries({ queryKey: ['api-keys'] })
    },
  })
}

/** Revokes a key the user owns. */
export function useRevokeKey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (keyId: string) =>
      egent.json('/v1/keys/revoke', { method: 'POST', body: JSON.stringify({ keyId }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['api-keys'] }),
  })
}

// ── active key (localStorage) — the Bearer the chat sends to Plano ───────────
const STORAGE_KEY = 'plano_api_key'
const listeners = new Set<() => void>()

export interface ActiveKey {
  secret: string
  keyId: string
  name: string
}

// Cached so getSnapshot returns a stable reference (required by
// useSyncExternalStore) — only re-parse when the stored string changes.
let cache: { raw: string | null; parsed: ActiveKey | null } = { raw: null, parsed: null }

function readActive(): ActiveKey | null {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(STORAGE_KEY)
  } catch {
    raw = null
  }
  if (raw !== cache.raw) {
    cache = { raw, parsed: raw ? (JSON.parse(raw) as ActiveKey) : null }
  }
  return cache.parsed
}

/** The raw secret the chat sends as Bearer (null if no key is active). */
export function getActiveApiKey(): string | null {
  return readActive()?.secret ?? null
}

export function setActiveKey(key: ActiveKey) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(key))
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((l) => l())
}

export function clearActiveKey() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((l) => l())
}

const subscribe = (cb: () => void) => {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

/** Reactive read of the active key object (re-renders when set/cleared). */
export function useActiveKey(): ActiveKey | null {
  return useSyncExternalStore(subscribe, readActive, () => null)
}

/** Reactive read of just the active secret (used by the model list query). */
export function useActiveApiKey(): string | null {
  return useSyncExternalStore(subscribe, getActiveApiKey, () => null)
}
