import { useQuery } from '@tanstack/react-query'
import { egent } from './egent'

/**
 * Metering balance for the signed-in user (the Talos actor). Read directly
 * from the Talos self-service surface `GET /v2alpha1/self/actorBalance`
 * (cookie-authenticated; the edge injects X-User-Id, Talos uses it as the
 * actor_id). Values are micros (1e6 = $1). quotaMicros 0 = unlimited.
 *
 * Protojson serializes int64 as strings; we parse to number here because
 * micros values fit comfortably inside JS Number.MAX_SAFE_INTEGER in
 * practice (would only overflow past ~$9 billion of credit).
 */
export interface Balance {
  remainingMicros: number
  quotaMicros: number
}

export function useBalance() {
  return useQuery({
    queryKey: ['balance'],
    queryFn: async () => {
      const r = await egent.json<{ quotaMicros: string; remainingMicros: string }>(
        '/v2alpha1/self/actorBalance',
      )
      return {
        quotaMicros: Number(r?.quotaMicros ?? 0),
        remainingMicros: Number(r?.remainingMicros ?? 0),
      }
    },
    // Balance changes as the user spends; refresh on focus and every 60s.
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}

/** Formats a micros amount ($1 = 1_000_000) as a dollar string. */
export function formatMicros(micros: number): string {
  return `$${(micros / 1_000_000).toFixed(2)}`
}
