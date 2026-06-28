import { useEffect, useState } from 'react'
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
import { useSession, useLogout } from '@/lib/auth'
import { useWorkspaces, useCreateWorkspace } from '@/lib/workspaces'
import { useActiveWorkspaceId, setActiveWorkspace, isWorkspaceChosen } from '@/lib/active-workspace'
import { NAV_ITEMS, type View } from '@/lib/views'

interface AppSidebarProps {
  view: View
  onView: (view: View) => void
  onNewConversation: () => void
  creatingConversation?: boolean
}

// Placeholder balance — billing balance has no read endpoint wired yet.
const BALANCE = 6.2
const BALANCE_CAP = 25

export function AppSidebar({
  view,
  onView,
  onNewConversation,
  creatingConversation,
}: AppSidebarProps) {
  const { theme, setTheme } = useTheme()
  const { data: session } = useSession()
  const logout = useLogout()
  const [signingOut, setSigningOut] = useState(false)

  const email =
    (session?.identity?.traits as { email?: string } | undefined)?.email ?? 'you@example.com'
  const initials = email.slice(0, 2).toUpperCase()
  const needsApproval = false // tasks badge placeholder
  const { data: workspaces } = useWorkspaces()
  const activeWsId = useActiveWorkspaceId()
  const createWorkspace = useCreateWorkspace()
  const activeName = activeWsId
    ? (workspaces?.find((w) => w.id === activeWsId)?.name ?? 'Workspace')
    : 'Personal'

  const handleNewWorkspace = () => {
    const name = window.prompt('Workspace name')?.trim()
    if (name) createWorkspace.mutate(name)
  }

  // Workspace-first: land a user with no explicit choice in their first
  // workspace (the default one provisioned at registration). Fires once — after
  // it sets the active workspace, `isWorkspaceChosen()` is true and it won't
  // re-snap if the user later picks "Personal".
  useEffect(() => {
    if (!isWorkspaceChosen() && workspaces && workspaces.length > 0) {
      setActiveWorkspace(workspaces[0].id)
    }
  }, [workspaces])

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
            <DropdownMenuItem className="gap-2" onClick={handleNewWorkspace}>
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
                    onClick={() => onView(item.key)}
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
              ${BALANCE.toFixed(2)}
            </span>
          </div>
          <Progress value={(BALANCE / BALANCE_CAP) * 100} />
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
    </Sidebar>
  )
}
