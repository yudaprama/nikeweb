import { useMemo, useState } from 'react'
import { Search, Trash2, Pencil } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ViewHeader } from '@/components/view-header'
import { ChatView } from '@/components/chat-view'
import { ModelPicker } from '@/components/model-picker'
import { cn } from '@/lib/utils'
import {
  useSessions,
  useDeleteSession,
  useRenameSession,
} from '@/lib/sessions'

interface ChatPageProps {
  activeId: string | null
  onSelect: (id: string) => void
  model?: string
  onModel: (model: string) => void
}

export function ChatPage({ activeId, onSelect, model, onModel }: ChatPageProps) {
  const { data: sessions, isLoading } = useSessions()
  const deleteSession = useDeleteSession()
  const renameSession = useRenameSession()
  const [search, setSearch] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameText, setRenameText] = useState('')

  const filtered = useMemo(() => {
    if (!sessions) return []
    const q = search.trim().toLowerCase()
    if (!q) return sessions
    return sessions.filter((s) => (s.title ?? '').toLowerCase().includes(q))
  }, [sessions, search])

  const activeTitle =
    sessions?.find((s) => s.id === activeId)?.title || 'New conversation'

  const commitRename = (id: string) => {
    const title = renameText.trim()
    if (title) renameSession.mutate({ id, title })
    setRenamingId(null)
  }

  return (
    <div className="flex h-full min-h-0">
      {/* conversation list column */}
      <div className="hidden w-72 shrink-0 flex-col border-r md:flex">
        <div className="p-3">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations"
              className="h-9 pl-8"
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="space-y-0.5 px-2 pb-3">
            {isLoading ? (
              <div className="space-y-2 p-1">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : filtered.length > 0 ? (
              filtered.map((s) => (
                <div
                  key={s.id}
                  onClick={() => onSelect(s.id)}
                  className={cn(
                    'group hover:bg-accent relative cursor-pointer rounded-lg border border-transparent px-2.5 py-2 transition-colors',
                    s.id === activeId && 'bg-accent border-border',
                  )}
                >
                  {renamingId === s.id ? (
                    <Input
                      autoFocus
                      value={renameText}
                      onChange={(e) => setRenameText(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={() => commitRename(s.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename(s.id)
                        if (e.key === 'Escape') setRenamingId(null)
                      }}
                      className="h-7"
                    />
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {s.title || 'Untitled'}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 shrink-0 opacity-0 group-hover:opacity-100"
                        aria-label="Rename"
                        onClick={(e) => {
                          e.stopPropagation()
                          setRenamingId(s.id)
                          setRenameText(s.title || '')
                        }}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive size-6 shrink-0 opacity-0 group-hover:opacity-100"
                        aria-label="Delete"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteSession.mutate(s.id)
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-muted-foreground px-2 py-8 text-center text-sm">
                {search ? 'No conversations match.' : 'No conversations yet.'}
              </p>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* thread */}
      <div className="flex min-w-0 flex-1 flex-col">
        <ViewHeader title={activeTitle}>
          <ModelPicker value={model} onChange={onModel} />
        </ViewHeader>
        {activeId ? (
          <div className="min-h-0 flex-1">
            <ChatView key={activeId} sessionId={activeId} model={model} />
          </div>
        ) : (
          <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
            Select or start a conversation.
          </div>
        )}
      </div>
    </div>
  )
}
