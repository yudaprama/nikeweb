import qs from 'qs'
import { config } from '@/lib/config'
import { getActiveWorkspaceId } from '@/lib/active-workspace'
import { Api } from './generated/Api'

/**
 * Hatchet API client — the upstream swagger-generated client (`generated/`),
 * retargeted at OUR auth edge instead of Hatchet's native cloud transport.
 *
 * Differences from the upstream `hatchet/frontend` client:
 *   - baseURL → `${edgeUrl}/.hatchet` (Oathkeeper strips the prefix to `:8080`).
 *   - auth → the Kratos session cookie (`withCredentials`), NOT an exchange token.
 *     The generated methods pass `secure: true`, but with no `securityWorker`
 *     configured that is a no-op, so no `Authorization` header is added — the
 *     edge injects identity from the cookie.
 *   - tenant → the active Kawai workspace (tenant == workspace, same UUID),
 *     forwarded as `X-Workspace-Id` so the edge can authorize via Keto. Callers
 *     also pass the workspace id as the `{tenant}` path segment.
 *
 * This is the single transport seam: port any `hatchet/frontend` page by pointing
 * its data hooks at `hatchetApi`; no further auth wiring is needed.
 */
export class HatchetError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'HatchetError'
    this.status = status
  }
}

/** Active workspace == Hatchet tenant id. Throws if none is selected. */
export function tenantId(): string {
  const ws = getActiveWorkspaceId()
  if (!ws) {
    throw new HatchetError(400, 'No active workspace — select one before using Hatchet')
  }
  return ws
}

export const hatchetApi = new Api({
  baseURL: `${config.edgeUrl}/.hatchet`,
  withCredentials: true,
  paramsSerializer: (params) => qs.stringify(params, { arrayFormat: 'repeat' }),
})

// Forward the active workspace as the tenant header on every request so the edge
// can authorize membership via Keto before the call reaches Hatchet.
hatchetApi.instance.interceptors.request.use((cfg) => {
  const ws = getActiveWorkspaceId()
  if (ws) {
    cfg.headers = cfg.headers ?? {}
    cfg.headers['X-Workspace-Id'] = ws
  }
  return cfg
})

// Normalize Axios errors into HatchetError so callers get a consistent shape.
hatchetApi.instance.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status ?? 0
    const body = err?.response?.data
    const msg =
      (typeof body === 'string' && body) ||
      body?.errors?.[0]?.description ||
      err?.message ||
      'Hatchet request failed'
    return Promise.reject(new HatchetError(status, msg))
  },
)
