import { useMemo } from 'react'
import { Loader2, RotateCcw } from 'lucide-react'
import { ViewHeader } from '@/components/view-header'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useWorkflowRuns, useReplayRuns } from '@/lib/hatchet'

/**
 * Workflow runs, backed by Hatchet (durable execution) via the edge — replaces
 * the old egent-lobehub/Temporal `/v1/tasks` surface. Rendered defensively
 * against Hatchet's run-row shape (field names vary across endpoints/versions).
 */
interface RunRow {
  metadata?: { id?: string }
  id?: string
  displayName?: string
  name?: string
  status?: string
  readableStatus?: string
  startedAt?: string
  createdAt?: string
}

interface RunsResponse {
  rows?: RunRow[]
  runs?: RunRow[]
}

function runId(r: RunRow): string {
  return r.metadata?.id ?? r.id ?? ''
}
function runName(r: RunRow): string {
  return r.displayName ?? r.name ?? runId(r) ?? 'run'
}
function runStatus(r: RunRow): string {
  return (r.readableStatus ?? r.status ?? 'UNKNOWN').toUpperCase()
}

function statusColor(status: string): string {
  if (status.includes('FAIL') || status.includes('ERROR')) return 'bg-destructive'
  if (status.includes('SUCC') || status.includes('COMPLETE')) return 'bg-emerald-500'
  if (status.includes('RUN')) return 'bg-primary animate-pulse'
  if (status.includes('PEND') || status.includes('QUEUE')) return 'bg-amber-500'
  return 'bg-muted-foreground'
}

export function TasksView() {
  const runs = useWorkflowRuns<RunsResponse>()
  const replay = useReplayRuns()

  const rows: RunRow[] = useMemo(() => runs.data?.rows ?? runs.data?.runs ?? [], [runs.data])

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ViewHeader title="Tasks" />
      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-2xl px-6 py-8">
          <p className="text-muted-foreground mb-6 max-w-md text-sm">
            Durable workflow runs, executed by Hatchet. Replay a run to re-execute it from the
            start.
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
                const id = runId(r)
                const status = runStatus(r)
                return (
                  <Card key={id || runName(r)}>
                    <CardContent className="px-4">
                      <div className="flex items-center gap-2.5">
                        <span className={cn('size-2 shrink-0 rounded-full', statusColor(status))} />
                        <span className="flex-1 truncate text-sm font-semibold">{runName(r)}</span>
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
