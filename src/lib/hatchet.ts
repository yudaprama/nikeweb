import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { config } from './config'
import { getActiveWorkspaceId } from './active-workspace'

/**
 * Client for the Hatchet durable-execution API, reached DIRECTLY through the
 * auth edge at `${edgeUrl}/.hatchet/api/v1/...` — no egent-lobehub hop. Hatchet
 * runs in edge auth mode: tenant == Kawai workspace (same UUID), JIT-provisioned
 * from the edge-injected `X-User-Id`. The edge authorizes workspace membership
 * via Keto before the request lands, so we just send the session cookie and the
 * active workspace id; the tenant path segment equals that workspace id.
 *
 * Response/request bodies are Hatchet's rich types — kept loose here (callers can
 * narrow). This unlocks run history, DAG (shape), and replay directly in the SPA.
 */
export class HatchetError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'HatchetError'
    this.status = status
  }
}

/** Active workspace == Hatchet tenant id. Throws if no workspace is selected. */
function tenantId(): string {
  const ws = getActiveWorkspaceId()
  if (!ws) {
    throw new HatchetError(400, 'No active workspace — select one before using Hatchet')
  }
  return ws
}

async function hatchetFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const ws = tenantId()
  const res = await fetch(`${config.edgeUrl}/.hatchet${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Workspace-Id': ws,
      ...(init.headers ?? {}),
    },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new HatchetError(res.status, body || res.statusText)
  }
  return res
}

async function getJSON<T>(path: string): Promise<T> {
  const res = await hatchetFetch(path)
  return (await res.json()) as T
}

async function postJSON<T>(path: string, body: unknown): Promise<T> {
  const res = await hatchetFetch(path, { method: 'POST', body: JSON.stringify(body) })
  // Some Hatchet mutations return 204/empty.
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

/** Tenant-scoped base path for the active workspace. */
function base(): string {
  return `/api/v1/tenants/${encodeURIComponent(tenantId())}`
}
function stableBase(): string {
  return `/api/v1/stable/tenants/${encodeURIComponent(tenantId())}`
}

export const hatchet = {
  /** Run history (paginated list of workflow runs). `query` is appended verbatim. */
  listRuns: <T = unknown>(query = ''): Promise<T> =>
    getJSON<T>(`${stableBase()}/workflow-runs${query ? `?${query}` : ''}`),

  /** A single workflow run. */
  getRun: <T = unknown>(runId: string): Promise<T> =>
    getJSON<T>(`${base()}/workflow-runs/${encodeURIComponent(runId)}`),

  /** The run's DAG / shape (steps + edges) for visualization. */
  getRunShape: <T = unknown>(runId: string): Promise<T> =>
    getJSON<T>(`${base()}/workflow-runs/${encodeURIComponent(runId)}/shape`),

  /** Replay one or more workflow runs by id. */
  replayRuns: <T = unknown>(workflowRunIds: string[]): Promise<T> =>
    postJSON<T>(`${base()}/workflow-runs/replay`, { ids: workflowRunIds }),

  /** List workflow definitions in the workspace. */
  listWorkflows: <T = unknown>(): Promise<T> => getJSON<T>(`${base()}/workflows`),
}

export function useWorkflowRuns<T = unknown>(query = '') {
  const ws = getActiveWorkspaceId()
  return useQuery({
    queryKey: ['hatchet', 'runs', ws, query],
    queryFn: () => hatchet.listRuns<T>(query),
    enabled: !!ws,
  })
}

export function useWorkflowRun<T = unknown>(runId: string | null) {
  const ws = getActiveWorkspaceId()
  return useQuery({
    queryKey: ['hatchet', 'run', ws, runId],
    queryFn: () => hatchet.getRun<T>(runId as string),
    enabled: !!ws && !!runId,
  })
}

export function useWorkflowRunShape<T = unknown>(runId: string | null) {
  const ws = getActiveWorkspaceId()
  return useQuery({
    queryKey: ['hatchet', 'shape', ws, runId],
    queryFn: () => hatchet.getRunShape<T>(runId as string),
    enabled: !!ws && !!runId,
  })
}

export function useReplayRuns() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (workflowRunIds: string[]) => hatchet.replayRuns(workflowRunIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hatchet', 'runs'] }),
  })
}
