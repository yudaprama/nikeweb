import { useState } from 'react'
import { ViewHeader } from '@/components/view-header'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type TaskState = 'run' | 'approval' | 'done'

interface Task {
  id: string
  title: string
  step: string
  pct: number
  status: string
  state: TaskState
  detail: string
}

const INITIAL: Task[] = [
  { id: 't1', title: 'Compile a market scan for the travel app', step: 'Reading 14 competitor sites and extracting positioning…', pct: 62, status: 'Running', state: 'run', detail: 'Step 4 of 6 · ~3 min left' },
  { id: 't2', title: "Reconcile last month's receipts", step: 'Paused — wants to categorize a $240 charge as "software". Approve?', pct: 45, status: 'Needs you', state: 'approval', detail: 'Step 3 of 7 · waiting' },
  { id: 't3', title: 'Draft 5 blog post outlines', step: 'Completed and saved to knowledge base.', pct: 100, status: 'Done', state: 'done', detail: 'Finished 12 min ago' },
]

export function TasksView() {
  const [tasks, setTasks] = useState(INITIAL)

  const resolve = (id: string, approved: boolean) =>
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              state: 'run',
              status: 'Running',
              step: approved ? 'Approved — continuing…' : 'Skipped that step — moving on.',
              detail: 'Step 4 of 7 · resuming',
            }
          : t,
      ),
    )

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ViewHeader title="Tasks" />
      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-2xl px-6 py-8">
          <p className="text-muted-foreground mb-6 max-w-md text-sm">
            Long-running jobs that work on their own and report back. Some pause for your approval
            mid-run.
          </p>
          <div className="flex flex-col gap-3">
            {tasks.map((t) => (
              <Card key={t.id}>
                <CardContent className="px-4">
                  <div className="mb-2.5 flex items-center gap-2.5">
                    <span
                      className={cn(
                        'size-2 shrink-0 rounded-full',
                        t.state === 'approval'
                          ? 'bg-amber-500'
                          : t.state === 'done'
                            ? 'bg-emerald-500'
                            : 'bg-primary animate-pulse',
                      )}
                    />
                    <span className="flex-1 text-sm font-semibold">{t.title}</span>
                    <Badge variant={t.state === 'approval' ? 'default' : 'secondary'}>
                      {t.status}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mb-2.5 text-sm leading-relaxed">{t.step}</p>
                  <Progress value={t.pct} />
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-muted-foreground font-mono text-xs">{t.detail}</span>
                    {t.state === 'approval' && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => resolve(t.id, true)}>
                          Approve step
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => resolve(t.id, false)}>
                          Skip
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
