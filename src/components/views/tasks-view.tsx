import { Clock } from 'lucide-react'
import { ViewHeader } from '@/components/view-header'

/**
 * Tasks — scheduled / durable AI agent tasks. Shelved for now (see the Hatchet
 * exploration): the run surface, retargeted client, and DAG view live dormant in
 * `@/lib/hatchet` + `task-run-view`/`task-run-graph` for when this is revisited.
 */
export function TasksView() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <ViewHeader title="Tasks" />
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="bg-muted flex size-12 items-center justify-center rounded-full">
          <Clock className="text-muted-foreground size-6" />
        </div>
        <h2 className="text-lg font-semibold">Coming soon</h2>
        <p className="text-muted-foreground max-w-sm text-sm">
          Describe a task for an agent and schedule it — recurring research, weekly digests, and
          more. We're still building this.
        </p>
      </div>
    </div>
  )
}
