import { useMutation, useQueryClient } from '@tanstack/react-query'
import { egent } from './egent'
import { clearActiveKey } from './keys'
import { setActiveWorkspace } from './active-workspace'

/**
 * Self-service account closure. `POST /v1/account/delete` (cookie-authed via the
 * Oathkeeper `prest-workspaces-v1` rule; `X-User-Id` is edge-injected, so this
 * can only ever close the CALLER's account — there is no request body). The
 * server purges the user's Kawai data, owned workspaces (+ Keto tuples),
 * memberships, and finally the Kratos identity (which also invalidates the
 * session cookie server-side).
 *
 * On success we drop all local client state and hard-navigate to /login — we do
 * NOT run the Kratos logout flow because the identity (and its session) no
 * longer exist by then.
 */
export function useDeleteAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      egent.json<{ deleted: boolean }>('/v1/account/delete', { method: 'POST' }),
    onSuccess: () => {
      clearActiveKey()
      setActiveWorkspace(null)
      qc.clear()
      // Hard navigation: the SPA's authed state is gone and the session cookie
      // is dead, so bounce to the login gate.
      window.location.href = '/login'
    },
  })
}
