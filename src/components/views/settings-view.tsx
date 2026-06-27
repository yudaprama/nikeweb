import { Plus } from 'lucide-react'
import { ViewHeader } from '@/components/view-header'
import { KeysPanel } from '@/components/keys-panel'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const USAGE_BARS = [
  { name: 'Sage Pro', amount: '$12.40', pct: 66 },
  { name: 'Sage Mini', amount: '$3.92', pct: 21 },
  { name: 'Sage Reason', amount: '$2.42', pct: 13 },
]

const CHARGES = [
  { label: 'Sage Pro · Plan my week conversation', when: 'Today, 9:14 AM', amount: '−$0.42' },
  { label: 'Task · Market scan (running)', when: 'Today, 8:50 AM', amount: '−$1.18' },
  { label: 'Sage Mini · Quick lookup', when: 'Yesterday', amount: '−$0.06' },
  { label: 'Top-up', when: 'Apr 2', amount: '+$25.00' },
]

const WORKSPACES = [
  { id: 'personal', name: 'Personal', meta: '12 conversations · just you', active: true },
  { id: 'research', name: 'Research', meta: '2 conversations · just you', active: false },
  { id: 'side', name: 'Side project', meta: '2 conversations · just you', active: false },
]

export function SettingsView() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <ViewHeader title="Settings" />
      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-2xl px-6 py-8">
          <Tabs defaultValue="usage">
            <TabsList className="mb-6">
              <TabsTrigger value="usage">Usage &amp; billing</TabsTrigger>
              <TabsTrigger value="keys">API keys</TabsTrigger>
              <TabsTrigger value="workspaces">Workspaces</TabsTrigger>
            </TabsList>

            <TabsContent value="usage">
              <div className="mb-6 grid gap-3 sm:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-muted-foreground text-xs font-normal">
                      Current balance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="font-mono text-2xl font-medium">$6.20</div>
                    <Button size="sm" className="mt-3 w-full">
                      Add funds
                    </Button>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-muted-foreground text-xs font-normal">
                      Spent this month
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="font-mono text-2xl font-medium">$18.74</div>
                    <p className="text-muted-foreground mt-3 text-xs">
                      Across 142 requests · 3 agents
                    </p>
                  </CardContent>
                </Card>
              </div>

              <h3 className="text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-wide">
                Usage by model
              </h3>
              <div className="mb-6 flex flex-col gap-4">
                {USAGE_BARS.map((u) => (
                  <div key={u.name}>
                    <div className="mb-1.5 flex justify-between text-sm">
                      <span className="font-medium">{u.name}</span>
                      <span className="text-muted-foreground font-mono">{u.amount}</span>
                    </div>
                    <Progress value={u.pct} />
                  </div>
                ))}
              </div>

              <h3 className="text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-wide">
                Recent activity
              </h3>
              <div className="overflow-hidden rounded-xl border">
                {CHARGES.map((c, i) => (
                  <div key={c.label}>
                    {i > 0 && <Separator />}
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm">{c.label}</div>
                        <div className="text-muted-foreground text-xs">{c.when}</div>
                      </div>
                      <span className="text-muted-foreground font-mono text-sm">{c.amount}</span>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="keys">
              <KeysPanel />
            </TabsContent>

            <TabsContent value="workspaces">
              <div className="mb-4 flex items-center justify-between gap-4">
                <p className="text-muted-foreground max-w-sm text-sm">
                  Switch the active workspace or create a new one. Member roles &amp; permissions are
                  coming soon.
                </p>
                <Button size="sm" className="shrink-0 gap-2">
                  <Plus className="size-4" />
                  New workspace
                </Button>
              </div>
              <div className="flex flex-col gap-3">
                {WORKSPACES.map((ws) => (
                  <Card key={ws.id} className={ws.active ? 'border-primary' : undefined}>
                    <CardContent className="flex items-center gap-3 px-4">
                      <div className="bg-muted size-10 shrink-0 rounded-lg" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold">{ws.name}</div>
                        <div className="text-muted-foreground text-xs">{ws.meta}</div>
                      </div>
                      {ws.active ? (
                        <Badge>Active</Badge>
                      ) : (
                        <Button variant="outline" size="sm">
                          Switch
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  )
}
