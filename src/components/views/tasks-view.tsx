import { Link } from '@tanstack/react-router'
import { Loader2, RotateCcw } from 'lucide-react'
import { ViewHeader } from '@/components/view-header'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  useWorkflowRuns,
  useReplayRuns,
  statusColor,
  type V1TaskSummary,
} from '@/lib/hatchet'

/**
 * Workflow runs, backed by Hatchet (durable execution) via the edge. Uses the
 * retargeted generated client (`@/lib/hatchet`) — same edge transport, upstream
 * types. Click a run to open its detail (`/tasks/$run`); replay re-executes it.
 */

export function TasksView() {
  const runs = useWorkflowRuns()
  const replay = useReplayRuns()

  const rows: V1TaskSummary[] = runs.data?.rows ?? []

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ViewHeader title="Tasks" />
      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-2xl px-6 py-8">
          <p className="text-muted-foreground mb-6 max-w-md text-sm">
            Durable workflow runs, executed by Hatchet. Open a run for its task graph, or replay it
            to re-execute from the start.
          </p>

          {runs.isLoading ? (
            <div className="text-muted-foreground flex items-center gap-2 py-8 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Loading runs…
            </div>
          ) : runs.isError ? (
            <p className="text-destructive py-8 text-sm">
              Couldn't load runs. {(runs.error as Error)?.message}
            </p>
          ) : rows.length === 0 ? (
            <p className="text-muted-foreground py-8 text-sm">No runs yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {rows.map((r) => {
                const id = r.workflowRunExternalId
                const status = r.status ?? 'QUEUED'
                return (
                  <Card key={r.metadata.id}>
                    <CardContent className="px-4">
                      <div className="flex items-center gap-2.5">
                        <span className={cn('size-2 shrink-0 rounded-full', statusColor(status))} />
                        <Link
                          to="/tasks/$run"
                          params={{ run: id }}
                          className="flex-1 truncate text-sm font-semibold hover:underline"
                        >
                          {r.displayName || id}
                        </Link>
                        <Badge variant="secondary">{status}</Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          disabled={!id || replay.isPending}
                          onClick={() => id && replay.mutate([id])}
                        >
                          <RotateCcw className="size-3.5" />
                          Replay
                        </Button>
                      </div>
                      {(r.startedAt ?? r.createdAt) && (
                        <span className="text-muted-foreground mt-2 block font-mono text-xs">
                          {r.startedAt ?? r.createdAt}
                        </span>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
