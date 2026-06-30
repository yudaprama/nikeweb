import { useEffect, useState } from 'react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { Plus, ChevronsUpDown, Check, Sun, Moon, Sparkles, LogOut } from 'lucide-react'
import { useTheme } from 'next-themes'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useSession, useLogout } from '@/lib/auth'
import { useWorkspaces, useCreateWorkspace } from '@/lib/workspaces'
import { useBalance, formatMicros } from '@/lib/billing'
import { useActiveWorkspaceId, setActiveWorkspace, isWorkspaceChosen } from '@/lib/active-workspace'
import { NAV_ITEMS, VIEW_PATHS, type View } from '@/lib/views'

interface AppSidebarProps {
  onNewConversation: () => void
  creatingConversation?: boolean
}

const VIEW_FROM_PATH: Record<string, View> = Object.fromEntries(
  Object.entries(VIEW_PATHS).map(([view, path]) => [path, view as View]),
)

export function AppSidebar({
  onNewConversation,
  creatingConversation,
}: AppSidebarProps) {
  const navigate = useNavigate()
  const location = useRouterState({ select: (s) => s.location })
  const currentPath = location.pathname
  const view: View =
    VIEW_FROM_PATH[currentPath] ??
    (currentPath.startsWith('/settings') ? 'settings' : 'chat')
  const { theme, setTheme } = useTheme()
  const { data: session } = useSession()
  const logout = useLogout()
  const [signingOut, setSigningOut] = useState(false)

  const email =
    (session?.identity?.traits as { email?: string } | undefined)?.email ?? 'you@example.com'
  const initials = email.slice(0, 2).toUpperCase()
  const needsApproval = false // tasks badge placeholder
  const { data: workspaces } = useWorkspaces()
  const { data: balance } = useBalance()
  const activeWsId = useActiveWorkspaceId()
  const createWorkspace = useCreateWorkspace()
  const activeName = activeWsId
    ? (workspaces?.find((w) => w.id === activeWsId)?.name ?? 'Workspace')
    : 'Personal'

  // Balance: micros from Talos. quotaMicros 0 = unlimited (no cap bar).
  const remaining = balance?.remainingMicros ?? 0
  const quota = balance?.quotaMicros ?? 0
  const balancePct = quota > 0 ? Math.max(0, Math.min(100, (remaining / quota) * 100)) : 100

  const [newWsOpen, setNewWsOpen] = useState(false)
  const [newWsName, setNewWsName] = useState('')

  const handleNewWorkspace = () => {
    const name = newWsName.trim()
    if (!name) return
    createWorkspace.mutate(name)
    setNewWsName('')
    setNewWsOpen(false)
  }

  // Keep the active workspace valid against the user's real membership list.
  //  1. Stale/orphan active id (workspace deleted, or not a member) → reset to
  //     personal. Without this the client keeps sending a phantom X-Workspace-Id
  //     and the edge gate 403s EVERY workspace-scoped read.
  //  2. Workspace-first: a user with no explicit choice lands in their first
  //     workspace (provisioned at registration). Fires once — afterwards
  //     `isWorkspaceChosen()` is true so it won't re-snap if they pick Personal.
  useEffect(() => {
    if (!workspaces) return // undefined while loading / on error — don't touch
    if (activeWsId && !workspaces.some((w) => w.id === activeWsId)) {
      setActiveWorkspace(null)
      return
    }
    if (!isWorkspaceChosen() && workspaces.length > 0) {
      setActiveWorkspace(workspaces[0].id)
    }
  }, [workspaces, activeWsId])

  const handleLogout = () => {
    setSigningOut(true)
    void logout()
  }

  return (
    <Sidebar>
      <SidebarHeader className="gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              />
            }
          >
            <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
              <Sparkles className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{activeName}</span>
              <span className="text-muted-foreground truncate text-xs">
                {activeWsId ? 'Workspace' : 'Personal scope'}
              </span>
            </div>
            <ChevronsUpDown className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
            align="start"
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-muted-foreground text-xs">
                Workspaces
              </DropdownMenuLabel>
              <DropdownMenuItem className="gap-2" onClick={() => setActiveWorkspace(null)}>
                <span className="flex-1">Personal</span>
                {activeWsId === null && <Check className="size-4" />}
              </DropdownMenuItem>
              {workspaces?.map((ws) => (
                <DropdownMenuItem
                  key={ws.id}
                  className="gap-2"
                  onClick={() => setActiveWorkspace(ws.id)}
                >
                  <span className="flex-1">{ws.name}</span>
                  {ws.id === activeWsId && <Check className="size-4" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2" onClick={() => setNewWsOpen(true)}>
              <Plus className="size-4" />
              New workspace
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          onClick={onNewConversation}
          disabled={creatingConversation}
          className="w-full justify-center gap-2"
        >
          <Plus className="size-4" />
          New conversation
        </Button>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    isActive={view === item.key}
                    onClick={() => navigate({ to: VIEW_PATHS[item.key] })}
                  >
                    <item.icon className="size-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                  {item.key === 'tasks' && needsApproval && (
                    <SidebarMenuBadge>1</SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-3">
        <div className="px-1">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-muted-foreground text-xs">Balance</span>
            <span className="font-mono text-xs font-medium tabular-nums">
              {balance ? formatMicros(remaining) : '—'}
            </span>
          </div>
          <Progress value={balancePct} />
          <Button variant="outline" size="sm" className="mt-2 w-full">
            Add funds
          </Button>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                disabled={signingOut}
                className="flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left outline-none data-[state=open]:bg-sidebar-accent"
              />
            }
          >
            <Avatar className="size-8 rounded-lg">
              <AvatarFallback className="rounded-lg text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-sm leading-tight">
              <span className="text-muted-foreground truncate text-xs">{email}</span>
            </div>
            <ChevronsUpDown className="ml-auto size-4 opacity-60" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="end"
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-muted-foreground text-xs truncate">
                {email}
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-2 text-destructive focus:text-destructive"
              disabled={signingOut}
              onClick={handleLogout}
            >
              <LogOut className="size-4" />
              {signingOut ? 'Signing out…' : 'Sign out'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>

      <Dialog open={newWsOpen} onOpenChange={setNewWsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New workspace</DialogTitle>
            <DialogDescription>
              Workspaces keep conversations, knowledge, and members separate.
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={newWsName}
            onChange={(e) => setNewWsName(e.target.value)}
            placeholder="Workspace name"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleNewWorkspace()
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewWsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleNewWorkspace} disabled={!newWsName.trim() || createWorkspace.isPending}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sidebar>
  )
}
