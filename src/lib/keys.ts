import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'
import { egent } from './egent'

/**
 * Per-user Plano API keys. The user mints their OWN key (bound to their identity
 * as the Talos actor) through the Talos self-service surface behind the
 * Oathkeeper edge (cookie-authenticated), then the chat sends it as
 * `Authorization: Bearer <key>` directly to Plano's CORS-enabled model proxy.
 * A leaked key only spends that one user's quota.
 *
 * Endpoint layout (protojson output is camelCase, matching IssuedApiKey.*):
 *   GET    /v2alpha1/self/issuedApiKeys                      → ListIssuedApiKeysResponse
 *   POST   /v2alpha1/self/issuedApiKeys                      → IssueApiKeyResponse (201, secret shown once)
 *   POST   /v2alpha1/self/issuedApiKeys/{key_id}:revoke      → Empty (204, no body)
 */
export interface ApiKeyInfo {
  keyId: string
  name: string
  actorId: string
  status: string
  createTime: string
  expireTime: string
}

/** Lists the signed-in user's API keys (secrets are never returned by list). */
export function useKeys() {
  return useQuery({
    queryKey: ['api-keys'],
    queryFn: () =>
      egent
        .json<{ issuedApiKeys?: ApiKeyInfo[] }>('/v2alpha1/self/issuedApiKeys')
        .then((r) => r.issuedApiKeys ?? []),
  })
}

/** Issues a new key and auto-activates it for the chat (secret shown once). */
export function useCreateKey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name?: string) =>
      egent
        .json<{ issuedApiKey: { keyId: string; name: string; expireTime: string }; secret: string }>(
          '/v2alpha1/self/issuedApiKeys',
          {
            method: 'POST',
            body: JSON.stringify({ name: name || 'web-app' }),
          },
        )
        .then((r) => ({
          keyId: r.issuedApiKey.keyId,
          name: r.issuedApiKey.name,
          secret: r.secret,
          expireTime: r.issuedApiKey.expireTime,
        })),
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
    // keyId is in the path per the proto binding (body carries only reason).
    // The 204 response has no body; we read .text() so res.json() does not throw.
    mutationFn: (keyId: string) =>
      egent.json(`/v2alpha1/self/issuedApiKeys/${encodeURIComponent(keyId)}:revoke`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'REVOCATION_REASON_UNSPECIFIED' }),
      }),
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
