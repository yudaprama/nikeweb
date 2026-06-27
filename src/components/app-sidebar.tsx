import { Plus, ChevronsUpDown, Check, Sun, Moon, Sparkles } from 'lucide-react'
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
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useSession } from '@/lib/auth'
import { NAV_ITEMS, type View } from '@/lib/views'

interface AppSidebarProps {
  view: View
  onView: (view: View) => void
  onNewConversation: () => void
  creatingConversation?: boolean
}

// Static workspaces — no backend wiring yet (single-workspace OSS).
const WORKSPACES = [
  { id: 'personal', name: 'Personal', hint: 'Default workspace' },
  { id: 'research', name: 'Research', hint: 'Reading & notes' },
]

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

  const email =
    (session?.identity?.traits as { email?: string } | undefined)?.email ?? 'you@example.com'
  const initials = email.slice(0, 2).toUpperCase()
  const needsApproval = false // tasks badge placeholder
  const activeWs = WORKSPACES[0]

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
              <span className="truncate font-medium">{activeWs.name}</span>
              <span className="text-muted-foreground truncate text-xs">{activeWs.hint}</span>
            </div>
            <ChevronsUpDown className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
            align="start"
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Workspaces
            </DropdownMenuLabel>
            {WORKSPACES.map((ws) => (
              <DropdownMenuItem key={ws.id} className="gap-2">
                <span className="flex-1">{ws.name}</span>
                {ws.id === activeWs.id && <Check className="size-4" />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2">
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

        <div className="flex items-center gap-2 px-1">
          <Avatar className="size-8 rounded-lg">
            <AvatarFallback className="rounded-lg text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="text-muted-foreground truncate text-xs">{email}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Toggle theme"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
