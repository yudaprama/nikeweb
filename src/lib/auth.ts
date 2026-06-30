import { useQuery, useQueryClient } from '@tanstack/react-query'
import { config } from './config'
import { clearActiveKey } from './keys'
import { setActiveWorkspace } from './active-workspace'

export interface KratosTraits {
  email?: string
  name?: string
  username?: string
  avatar?: string
}

export interface KratosSession {
  active: boolean
  identity?: {
    id: string
    traits?: KratosTraits
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

/**
 * Ends the Kratos session. Drops all local client state first, then initiates
 * the Kratos browser logout flow: `GET /self-service/logout/browser` returns a
 * one-time `logout_url` for the current session; navigating there lets Kratos
 * revoke the session server-side, clear the session cookie, and 303 to
 * `default_browser_return_url` (`/login`, per kratos.yaml).
 */
export function useLogout() {
  const qc = useQueryClient()
  return async function logout(): Promise<void> {
    clearActiveKey()
    setActiveWorkspace(null)
    qc.clear()

    try {
      const res = await fetch(`${config.kratosUrl}/self-service/logout/browser`, {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      })
      if (res.ok) {
        const body = (await res.json()) as { logout_url?: string }
        if (body.logout_url) {
          window.location.href = body.logout_url
          return
        }
      }
    } catch {
      /* edge unreachable — fall back to a local redirect */
    }
    window.location.href = '/login'
  }
}
