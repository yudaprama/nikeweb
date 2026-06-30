import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useSyncExternalStore } from 'react'
import { egent, EgentError } from './egent'

/**
 * Per-user Plano API keys. The user mints their OWN key (bound to their identity
 * as the Talos actor) through the Talos self-service surface behind the
 * Oathkeeper edge (cookie-authenticated), then the chat sends it as
 * `Authorization: Bearer <key>` directly to Plano's CORS-enabled model proxy.
 * A leaked key only spends that one user's quota.
 *
 * Endpoint layout (protojson output is snake_case, matching the proto field names):
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

/** Raw snake_case shape Talos emits (protojson with original field names). */
interface RawIssuedApiKey {
  key_id: string
  name: string
  actor_id: string
  status: string
  create_time: string
  expire_time: string
}

function mapKey(k: RawIssuedApiKey): ApiKeyInfo {
  return {
    keyId: k.key_id,
    name: k.name,
    actorId: k.actor_id,
    status: k.status,
    createTime: k.create_time,
    expireTime: k.expire_time,
  }
}

/**
 * Lists the signed-in user's API keys (secrets are never returned by list).
 * Talos returns revoked keys too; we only surface ACTIVE ones so the user
 * can't click revoke on an already-dead key (which 409s).
 */
export function useKeys() {
  return useQuery({
    queryKey: ['api-keys'],
    queryFn: () =>
      egent
        .json<{ issued_api_keys?: RawIssuedApiKey[] }>('/v2alpha1/self/issuedApiKeys')
        .then((r) =>
          (r.issued_api_keys ?? [])
            .filter((k) => k.status === 'KEY_STATUS_ACTIVE')
            .map(mapKey),
        ),
  })
}

export interface CreateKeyInput {
  name?: string
  /**
   * Duration from now, encoded as protobuf Duration (e.g. "2592000s"). Omit for
   * the project default (30d). Talos does not support non-expiring keys; the
   * project max is 1 year (talos.yaml max_ttl: 8760h).
   */
  ttl?: string
  /**
   * Optional CIDR allowlist (IPv4/IPv6). NOTE: the self surface currently only
   * forwards name/ttl/request_id to the admin path — ip_restriction is accepted
   * by the JSON marshaler (DiscardUnknown) but NOT yet enforced. We still send
   * it so it activates automatically once SelfIssueApiKeyRequest carries the
   * field. Until then, treat keys as un-restricted.
   */
  allowedCidrs?: string[]
}

/** Issues a new key and auto-activates it for the chat (secret shown once). */
export function useCreateKey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateKeyInput = {}) => {
      const body: Record<string, unknown> = {
        name: input.name || 'web-app',
        // Idempotency key (AIP-155) so a double-submit can't mint two keys.
        request_id: crypto.randomUUID(),
      }
      if (input.ttl) body.ttl = input.ttl
      if (input.allowedCidrs && input.allowedCidrs.length > 0) {
        body.ip_restriction = { allowed_cidrs: input.allowedCidrs }
      }
      return egent
        .json<{ issued_api_key: RawIssuedApiKey; secret: string }>(
          '/v2alpha1/self/issuedApiKeys',
          { method: 'POST', body: JSON.stringify(body) },
        )
        .then((r) => ({
          keyId: r.issued_api_key.key_id,
          name: r.issued_api_key.name,
          secret: r.secret,
          expireTime: r.issued_api_key.expire_time,
        }))
    },
    onSuccess: (data) => {
      setActiveKey({ secret: data.secret, keyId: data.keyId, name: data.name })
      qc.invalidateQueries({ queryKey: ['api-keys'] })
    },
  })
}

/**
 * First-run provisioning: when a freshly registered user has zero keys and no
 * active key in this browser, mint one silently so chat works immediately
 * (without this, the chat transport throws "No API key…"). Fires at most once
 * per mount, and only on a genuinely empty account — a user who already has
 * keys (e.g. on another browser) is left alone so we don't pile up keys.
 * The minted secret lands in localStorage as the active key (never shown).
 */
export function useEnsureApiKey() {
  const { data: keys, isSuccess } = useKeys()
  const activeKey = useActiveKey()
  const createKey = useCreateKey()
  const fired = useRef(false)

  const noKeys = isSuccess && (keys?.length ?? 0) === 0
  const shouldMint = noKeys && !activeKey && !createKey.isPending

  useEffect(() => {
    if (fired.current || !shouldMint) return
    fired.current = true
    // Use the project max TTL (1 year) so the auto key doesn't expire under them.
    createKey.mutate({ name: 'web-app', ttl: '31536000s' })
  }, [shouldMint, createKey])
}

/** Revokes a key the user owns. */
export function useRevokeKey() {
  const qc = useQueryClient()
  return useMutation({
    // keyId is in the path per the proto binding (body carries only reason).
    // The 204 response has no body; egent.json returns null for it.
    // A 409 means the key was already revoked — the end state we wanted, so
    // treat it as success (the list refetch will drop it) instead of erroring.
    mutationFn: async (keyId: string) => {
      try {
        await egent.json(`/v2alpha1/self/issuedApiKeys/${encodeURIComponent(keyId)}:revoke`, {
          method: 'POST',
          body: JSON.stringify({ reason: 'REVOCATION_REASON_UNSPECIFIED' }),
        })
      } catch (err) {
        if (!(err instanceof EgentError && err.status === 409)) throw err
      }
    },
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
