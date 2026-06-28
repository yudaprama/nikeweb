import { useQuery } from '@tanstack/react-query'
import { egent } from './egent'

/**
 * Metering balance for the signed-in user (the Talos actor). Read server-side
 * via egent-lobehub `GET /v1/balance` (admin-token Talos read, never browser →
 * Talos admin). Values are micros (1e6 = $1). quotaMicros 0 = unlimited.
 */
export interface Balance {
  remainingMicros: number
  quotaMicros: number
}

export function useBalance() {
  return useQuery({
    queryKey: ['balance'],
    queryFn: () => egent.json<Balance>('/v1/balance'),
    // Balance changes as the user spends; refresh on focus and every 60s.
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}

/** Formats a micros amount ($1 = 1_000_000) as a dollar string. */
export function formatMicros(micros: number): string {
  return `$${(micros / 1_000_000).toFixed(2)}`
}
