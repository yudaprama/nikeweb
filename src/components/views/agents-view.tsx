import { useEffect, useState } from 'react'
import { Plus, Search, Calendar, Mail, Globe, FileText, Trash2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import { ViewHeader } from '@/components/view-header'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  useAgents,
  useCreateAgent,
  useUpdateAgent,
  useDeleteAgent,
  type AgentRow,
} from '@/lib/agents'

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div className="mb-2 block text-sm font-semibold">{children}</div>
}

const TOOL_META: { key: string; name: string; desc: string; icon: LucideIcon }[] = [
  { key: 'search_knowledge', name: 'Knowledge search', desc: 'Search your uploaded documents', icon: Search },
  { key: 'calendar', name: 'Calendar', desc: 'Read availability, create events', icon: Calendar },
  { key: 'email', name: 'Email', desc: 'Read, draft and send — with approval', icon: Mail },
  { key: 'web', name: 'Web search', desc: 'Look things up online', icon: Globe },
  { key: 'files', name: 'Files', desc: 'Read and write files', icon: FileText },
]

const MODELS = [
  { id: 'kawai-pro-max', name: 'Kawai Pro Max', price: '$3 / Mtok' },
  { id: 'kawai-pro', name: 'Kawai Pro', price: '$0.4 / Mtok' },
  { id: 'kawai', name: 'Kawai', price: '$8 / Mtok' },
]

function initialsOf(name: string): string {
  return name.slice(0, 2) || 'A'
}

interface Draft {
  name: string
  persona: string
  model: string
  tools: Record<string, boolean>
}

function draftFromAgent(a: AgentRow): Draft {
  return {
    name: a.name,
    persona: a.system_prompt ?? '',
    model: a.model || 'kawai-pro-max',
    tools: (a.params?.tools as Record<string, boolean>) ?? {},
  }
}

export function AgentsView() {
  const { data: agents, isLoading } = useAgents()
  const createAgent = useCreateAgent()
  const updateAgent = useUpdateAgent()
  const deleteAgent = useDeleteAgent()

  const [activeId, setActiveId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)

  // Keep a selection in sync as agents load / change.
  const active = agents?.find((a) => a.id === activeId) ?? null
  useEffect(() => {
    if (!agents || agents.length === 0) {
      setActiveId(null)
      setDraft(null)
      return
    }
    if (!activeId || !agents.some((a) => a.id === activeId)) {
      setActiveId(agents[0].id)
      setDraft(draftFromAgent(agents[0]))
    }
  }, [agents, activeId])

  const selectAgent = (a: AgentRow) => {
    setActiveId(a.id)
    setDraft(draftFromAgent(a))
  }

  const handleNew = async () => {
    try {
      const created = await createAgent.mutateAsync({
        name: 'New agent',
        system_prompt: 'You are a helpful assistant.',
        model: 'kawai-pro-max',
        params: { tools: {} },
      })
      setActiveId(created.id)
      setDraft(draftFromAgent(created))
    } catch {
      toast.error('Could not create agent')
    }
  }

  const handleSave = async () => {
    if (!active || !draft) return
    try {
      await updateAgent.mutateAsync({
        id: active.id,
        patch: {
          name: draft.name,
          system_prompt: draft.persona,
          model: draft.model,
          params: { tools: draft.tools },
        },
      })
      toast.success('Agent saved')
    } catch {
      toast.error('Could not save agent')
    }
  }

  const handleDelete = async (a: AgentRow) => {
    if (!window.confirm(`Delete "${a.name}"?`)) return
    try {
      await deleteAgent.mutateAsync(a.id)
    } catch {
      toast.error('Could not delete agent')
    }
  }

  const toolCount = draft ? Object.values(draft.tools).filter(Boolean).length : 0

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ViewHeader title="Agents" />
      <div className="flex min-h-0 flex-1">
        {/* agent list */}
        <div className="hidden w-64 shrink-0 flex-col border-r md:flex">
          <div className="flex items-center justify-between px-3 py-3">
            <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
              Agents
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label="New agent"
              onClick={handleNew}
              disabled={createAgent.isPending}
            >
              <Plus className="size-4" />
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="space-y-0.5 px-2 pb-3">
              {isLoading ? (
                <div className="space-y-2 p-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : !agents || agents.length === 0 ? (
                <p className="text-muted-foreground px-2 py-6 text-center text-xs">
                  No agents yet. Create one to get started.
                </p>
              ) : (
                agents.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => selectAgent(a)}
                    className={cn(
                      'hover:bg-accent flex w-full items-center gap-2.5 rounded-lg border border-transparent p-2 text-left transition-colors',
                      a.id === activeId && 'bg-accent border-border',
                    )}
                  >
                    <Avatar className="size-8 rounded-lg">
                      <AvatarFallback className="rounded-lg text-xs">
                        {initialsOf(a.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{a.name}</div>
                      <div className="text-muted-foreground truncate text-xs">
                        {a.model || 'no model'}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* detail */}
        <ScrollArea className="flex-1">
          {!active || !draft ? (
            <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
              Select or create an agent to configure it.
            </div>
          ) : (
            <div className="mx-auto max-w-2xl px-6 py-8">
              <div className="mb-6 flex items-center gap-3">
                <Avatar className="size-12 rounded-xl">
                  <AvatarFallback className="rounded-xl text-lg">
                    {initialsOf(draft.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <Input
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    className="text-lg font-semibold"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Delete agent"
                  onClick={() => handleDelete(active)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>

              <FieldLabel>Persona &amp; instructions</FieldLabel>
              <Textarea
                value={draft.persona}
                onChange={(e) => setDraft({ ...draft, persona: e.target.value })}
                className="mb-6 min-h-24"
              />

              <FieldLabel>Model</FieldLabel>
              <div className="mb-6 flex flex-col gap-2">
                {MODELS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setDraft({ ...draft, model: m.id })}
                    className={cn(
                      'hover:bg-accent flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors',
                      draft.model === m.id && 'border-primary bg-accent',
                    )}
                  >
                    <span
                      className={cn(
                        'flex size-4 items-center justify-center rounded-full border-2',
                        draft.model === m.id ? 'border-primary' : 'border-muted-foreground/40',
                      )}
                    >
                      {draft.model === m.id && <span className="bg-primary size-2 rounded-full" />}
                    </span>
                    <span className="flex-1 text-sm font-medium">{m.name}</span>
                    <span className="text-muted-foreground font-mono text-xs">{m.price}</span>
                  </button>
                ))}
              </div>

              <FieldLabel>
                Tools{' '}
                <span className="text-muted-foreground font-normal">· {toolCount} enabled</span>
              </FieldLabel>
              <div className="mb-6 overflow-hidden rounded-xl border">
                {TOOL_META.map((t, i) => (
                  <div key={t.key}>
                    {i > 0 && <Separator />}
                    <div className="flex items-center gap-3 px-3 py-3">
                      <div className="bg-muted text-muted-foreground flex size-8 items-center justify-center rounded-lg">
                        <t.icon className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">{t.name}</div>
                        <div className="text-muted-foreground text-xs">{t.desc}</div>
                      </div>
                      <Switch
                        checked={!!draft.tools[t.key]}
                        onCheckedChange={(v) =>
                          setDraft({ ...draft, tools: { ...draft.tools, [t.key]: v } })
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={updateAgent.isPending}>
                  {updateAgent.isPending ? 'Saving…' : 'Save changes'}
                </Button>
              </div>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  )
}
