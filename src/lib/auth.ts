import { useQuery } from '@tanstack/react-query'
import { config } from './config'

export interface KratosSession {
  active: boolean
  identity?: {
    id: string
    traits?: Record<string, unknown>
  }
}

/** Calls Kratos whoami via the edge; the session cookie rides along. */
async function whoami(): Promise<KratosSession | null> {
  const res = await fetch(`${config.kratosUrl}/sessions/whoami`, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })
  if (res.status === 401) return null
  if (!res.ok) throw new Error(`whoami ${res.status}`)
  return (await res.json()) as KratosSession
}

export function useSession() {
  return useQuery({
    queryKey: ['session'],
    queryFn: whoami,
    retry: false,
    staleTime: 60_000,
  })
}

/** Redirect to the Kratos browser login flow (returns here afterwards). */
export function loginUrl(): string {
  const ret = encodeURIComponent(window.location.href)
  return `${config.kratosUrl}/self-service/login/browser?return_to=${ret}`
}

export function registerUrl(): string {
  const ret = encodeURIComponent(window.location.href)
  return `${config.kratosUrl}/self-service/registration/browser?return_to=${ret}`
}
