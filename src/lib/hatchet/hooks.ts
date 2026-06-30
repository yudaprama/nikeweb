import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getActiveWorkspaceId } from '@/lib/active-workspace'
import { hatchetApi, tenantId } from './client'
import type {
  V1TaskSummary,
  V1TaskSummaryList,
  V1WorkflowRunDetails,
} from './generated/data-contracts'

/**
 * Typed react-query hooks over the retargeted Hatchet client. These replace the
 * hand-rolled `fetch` wrappers — same edge transport, but with the upstream's
 * generated types and method surface, so porting richer pages is mechanical.
 */

export interface RunListOptions {
  /** ISO timestamp; defaults to the last 24h. The v1 list endpoint requires it. */
  since?: string
  limit?: number
  offset?: number
  /** Whether to include DAGs or only tasks. Defaults to false (include DAGs). */
  onlyTasks?: boolean
}

/** Paginated workflow-run list for the active workspace. */
export function useWorkflowRuns(opts: RunListOptions = {}) {
  const ws = getActiveWorkspaceId()
  const since = opts.since ?? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  return useQuery<V1TaskSummaryList>({
    queryKey: ['hatchet', 'runs', ws, opts],
    enabled: !!ws,
    queryFn: async () => {
      const res = await hatchetApi.v1WorkflowRunList(tenantId(), {
        since,
        only_tasks: opts.onlyTasks ?? false,
        limit: opts.limit ?? 50,
        offset: opts.offset ?? 0,
      })
      return res.data
    },
  })
}

/** Full detail (run + tasks + events + shape) for a single workflow run. */
export function useWorkflowRun(runId: string | null) {
  const ws = getActiveWorkspaceId()
  return useQuery<V1WorkflowRunDetails>({
    queryKey: ['hatchet', 'run', ws, runId],
    enabled: !!ws && !!runId,
    queryFn: async () => {
      const res = await hatchetApi.v1WorkflowRunGet(runId as string)
      return res.data
    },
  })
}

/** Trigger a registered workflow by name with a JSON input payload. */
export function useTriggerWorkflow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (vars: { workflowName: string; input?: object }) => {
      const res = await hatchetApi.v1WorkflowRunCreate(tenantId(), {
        workflowName: vars.workflowName,
        input: vars.input ?? {},
      })
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hatchet', 'runs'] }),
  })
}

/** Replay one or more runs/tasks by external id. */
export function useReplayRuns() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (externalIds: string[]) => {
      const res = await hatchetApi.v1TaskReplay(tenantId(), { externalIds })
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hatchet', 'runs'] })
      qc.invalidateQueries({ queryKey: ['hatchet', 'run'] })
    },
  })
}

export type { V1TaskSummary, V1TaskSummaryList, V1WorkflowRunDetails }
