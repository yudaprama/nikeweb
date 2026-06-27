import { MessageSquarePlus, Trash2 } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useSessions, useCreateSession, useDeleteSession } from '@/lib/sessions'

interface AppSidebarProps {
  activeId: string | null
  onSelect: (id: string) => void
}

export function AppSidebar({ activeId, onSelect }: AppSidebarProps) {
  const { data: sessions, isLoading } = useSessions()
  const createSession = useCreateSession()
  const deleteSession = useDeleteSession()

  const handleNew = async () => {
    const created = await createSession.mutateAsync('New chat')
    if (created?.id) onSelect(created.id)
  }

  return (
    <Sidebar>
      <SidebarHeader className="p-2">
        <Button onClick={handleNew} disabled={createSession.isPending} className="w-full justify-start gap-2">
          <MessageSquarePlus className="size-4" />
          New chat
        </Button>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Conversations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {isLoading ? (
                <div className="space-y-2 p-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : sessions && sessions.length > 0 ? (
                sessions.map((s) => (
                  <SidebarMenuItem key={s.id}>
                    <SidebarMenuButton isActive={s.id === activeId} onClick={() => onSelect(s.id)}>
                      <span className="truncate">{s.title || 'Untitled'}</span>
                    </SidebarMenuButton>
                    <SidebarMenuAction
                      onClick={() => deleteSession.mutate(s.id)}
                      showOnHover
                      aria-label="Delete conversation"
                    >
                      <Trash2 className="size-4" />
                    </SidebarMenuAction>
                  </SidebarMenuItem>
                ))
              ) : (
                <p className="px-2 py-4 text-sm text-muted-foreground">No conversations yet.</p>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
