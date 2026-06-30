import { Link, useParams } from '@tanstack/react-router'
import { ArrowLeft, Loader2, RotateCcw } from 'lucide-react'
import { ViewHeader } from '@/components/view-header'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  useWorkflowRun,
  useReplayRuns,
  statusColor,
  type V1TaskSummary,
} from '@/lib/hatchet'

/** Pretty-print an object payload, collapsing empties. */
function Payload({ label, value }: { label: string; value: unknown }) {
  const isEmpty =
    value == null || (typeof value === 'object' && Object.keys(value as object).length === 0)
  if (isEmpty) return null
  return (
    <div className="mt-2">
      <span className="text-muted-foreground text-xs font-medium">{label}</span>
      <pre className="bg-muted mt-1 max-h-64 overflow-auto rounded-md p-2 font-mono text-xs">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  )
}

function TaskCard({ task }: { task: V1TaskSummary }) {
  return (
    <Card>
      <CardContent className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className={cn('size-2 shrink-0 rounded-full', statusColor(task.status))} />
          <span className="flex-1 truncate text-sm font-medium">{task.displayName}</span>
          <Badge variant="secondary">{task.status}</Badge>
          {typeof task.duration === 'number' && (
            <span className="text-muted-foreground font-mono text-xs">{task.duration}ms</span>
          )}
        </div>
        {task.errorMessage && (
          <p className="text-destructive mt-2 font-mono text-xs">{task.errorMessage}</p>
        )}
        <Payload label="Input" value={task.input} />
        <Payload label="Output" value={task.output} />
      </CardContent>
    </Card>
  )
}

export function TaskRunView() {
  const { run: runId } = useParams({ from: '/app/tasks/$run' })
  const detail = useWorkflowRun(runId)
  const replay = useReplayRuns()

  const run = detail.data?.run
  const tasks = detail.data?.tasks ?? []

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ViewHeader title={run?.displayName ?? 'Run'}>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          disabled={replay.isPending}
          onClick={() => replay.mutate([runId])}
        >
          <RotateCcw className="size-3.5" />
          Replay
        </Button>
      </ViewHeader>
      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-2xl px-6 py-8">
          <Link to="/tasks" className="text-muted-foreground mb-6 inline-flex items-center gap-1 text-sm hover:underline">
            <ArrowLeft className="size-3.5" />
            All runs
          </Link>

          {detail.isLoading ? (
            <div className="text-muted-foreground flex items-center gap-2 py-8 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Loading run…
            </div>
          ) : detail.isError ? (
            <p className="text-destructive py-8 text-sm">
              Couldn't load run. {(detail.error as Error)?.message}
            </p>
          ) : !run ? (
            <p className="text-muted-foreground py-8 text-sm">Run not found.</p>
          ) : (
            <>
              <div className="mb-6 flex items-center gap-2.5">
                <span className={cn('size-2.5 shrink-0 rounded-full', statusColor(run.status))} />
                <span className="text-base font-semibold">{run.displayName}</span>
                <Badge variant="secondary">{run.status}</Badge>
              </div>
              <div className="text-muted-foreground mb-6 grid grid-cols-2 gap-2 font-mono text-xs">
                {run.startedAt && <span>started {run.startedAt}</span>}
                {run.finishedAt && <span>finished {run.finishedAt}</span>}
                {typeof run.duration === 'number' && <span>{run.duration}ms</span>}
              </div>
              {run.errorMessage && (
                <p className="text-destructive mb-4 font-mono text-xs">{run.errorMessage}</p>
              )}
              <Payload label="Input" value={run.input} />
              <Payload label="Output" value={run.output} />

              <h2 className="text-muted-foreground mt-8 mb-3 text-xs font-medium uppercase tracking-wide">
                Tasks ({tasks.length})
              </h2>
              <div className="flex flex-col gap-3">
                {tasks.map((t) => (
                  <TaskCard key={t.metadata.id} task={t} />
                ))}
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
