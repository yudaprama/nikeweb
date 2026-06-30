import { Plus, Trash2, LogOut } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { ViewHeader } from '@/components/view-header'
import { KeysPanel } from '@/components/keys-panel'
import { WorkspaceMembersPanel } from '@/components/workspace-members-panel'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  useWorkspaces,
  useCreateWorkspace,
  useDeleteWorkspace,
  useLeaveWorkspace,
} from '@/lib/workspaces'
import { useDeleteAccount } from '@/lib/account'
import { useActiveWorkspaceId, setActiveWorkspace } from '@/lib/active-workspace'
import { useBalance, formatMicros } from '@/lib/billing'

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

function WorkspacesTab() {
  const { data: workspaces, isLoading } = useWorkspaces()
  const activeWsId = useActiveWorkspaceId()
  const createWorkspace = useCreateWorkspace()
  const deleteWorkspace = useDeleteWorkspace()
  const leaveWorkspace = useLeaveWorkspace()

  const handleNew = () => {
    const name = window.prompt('Workspace name')?.trim()
    if (name) createWorkspace.mutate(name)
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="text-muted-foreground max-w-sm text-sm">
          Switch the active workspace, create a new one, or manage members.
        </p>
        <Button size="sm" className="shrink-0 gap-2" onClick={handleNew} disabled={createWorkspace.isPending}>
          <Plus className="size-4" />
          New workspace
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {/* Personal scope is always available (workspace_id IS NULL). */}
        <Card className={activeWsId === null ? 'border-primary' : undefined}>
          <CardContent className="flex items-center gap-3 px-4">
            <div className="bg-muted size-10 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">Personal</div>
              <div className="text-muted-foreground text-xs">Just you · no workspace</div>
            </div>
            {activeWsId === null ? (
              <Badge>Active</Badge>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setActiveWorkspace(null)}>
                Switch
              </Button>
            )}
          </CardContent>
        </Card>

        {isLoading && <p className="text-muted-foreground text-sm">Loading workspaces…</p>}

        {workspaces?.map((ws) => {
          const active = ws.id === activeWsId
          return (
            <Card key={ws.id} className={active ? 'border-primary' : undefined}>
              <CardContent className="flex flex-col gap-3 px-4">
                <div className="flex items-center gap-3">
                  <div className="bg-muted size-10 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{ws.name}</div>
                    <div className="text-muted-foreground font-mono text-xs">{ws.id}</div>
                  </div>
                  {active ? <Badge>Active</Badge> : (
                    <Button variant="outline" size="sm" onClick={() => setActiveWorkspace(ws.id)}>
                      Switch
                    </Button>
                  )}
                </div>

                {active && (
                  <>
                    <Separator />
                    <WorkspaceMembersPanel workspaceId={ws.id} />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => leaveWorkspace.mutate(ws.id, {
                          onError: () => toast.error('Could not leave (sole owners must delete)'),
                        })}
                      >
                        <LogOut className="size-4" />
                        Leave
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive gap-1.5"
                        onClick={() => {
                          if (window.confirm(`Delete "${ws.name}"? This cannot be undone.`)) {
                            deleteWorkspace.mutate(ws.id, {
                              onError: () => toast.error('Could not delete workspace'),
                            })
                          }
                        }}
                      >
                        <Trash2 className="size-4" />
                        Delete
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </>
  )
}

export function UsageTab() {
  const { data: balance } = useBalance()
  return (
    <>
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-xs font-normal">
              Current balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-2xl font-medium">
              {balance ? formatMicros(balance.remainingMicros) : '—'}
            </div>
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
    </>
  )
}

export function KeysTab() {
  return <KeysPanel />
}

export function AccountTab() {
  const deleteAccount = useDeleteAccount()
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState('')

  const close = () => {
    setOpen(false)
    setConfirm('')
  }

  const handleConfirm = () => {
    if (confirm !== 'DELETE' || deleteAccount.isPending) return
    deleteAccount.mutate(undefined, {
      onError: () => toast.error('Could not delete account. Please retry or contact support.'),
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground max-w-sm text-sm">
        Closing your account permanently deletes your conversations, files,
        agents, and workspaces, and signs you out everywhere.
      </p>
      <Card className="border-destructive/40">
        <CardContent className="flex flex-col gap-3 px-4">
          <div className="text-destructive text-sm font-semibold">Danger zone</div>
          <p className="text-muted-foreground text-sm">
            This cannot be undone. You&apos;ll be signed out immediately and the
            account cannot be recovered.
          </p>
          <Button
            variant="destructive"
            size="sm"
            className="w-fit gap-2"
            onClick={() => setOpen(true)}
          >
            <Trash2 className="size-4" />
            Delete my account
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete account?</DialogTitle>
            <DialogDescription>
              This permanently removes your account and all associated data. Type{' '}
              <span className="font-mono font-semibold">DELETE</span> to confirm.
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="DELETE"
            autoComplete="off"
          />
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={confirm !== 'DELETE' || deleteAccount.isPending}
              onClick={handleConfirm}
            >
              {deleteAccount.isPending ? 'Deleting…' : 'Permanently delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export { WorkspacesTab }

// Tab → sub-path. The route is the source of truth so each tab is deep-linkable.
const SETTINGS_TABS = [
  { value: 'usage', label: 'Usage & billing', path: '/settings/usage' },
  { value: 'keys', label: 'API keys', path: '/settings/keys' },
  { value: 'workspaces', label: 'Workspaces', path: '/settings/workspaces' },
  { value: 'account', label: 'Account', path: '/settings/account' },
] as const

export function SettingsView() {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const active =
    SETTINGS_TABS.find((t) => pathname.startsWith(t.path))?.value ?? 'usage'

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ViewHeader title="Settings" />
      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-2xl px-6 py-8">
          <Tabs
            value={active}
            onValueChange={(v) => {
              const tab = SETTINGS_TABS.find((t) => t.value === v)
              if (tab) navigate({ to: tab.path })
            }}
          >
            <TabsList className="mb-6">
              {SETTINGS_TABS.map((t) => (
                <TabsTrigger key={t.value} value={t.value}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Outlet />
        </div>
      </ScrollArea>
    </div>
  )
}
