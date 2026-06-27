import { useState } from 'react'
import { Plus, Search, Calendar, Mail, Globe, FileText } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { ViewHeader } from '@/components/view-header'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div className="mb-2 block text-sm font-semibold">{children}</div>
}

interface Agent {
  id: string
  name: string
  subtitle: string
  initials: string
  model: string
  persona: string
  tools: Record<string, boolean>
}

const TOOL_META: { key: string; name: string; desc: string; icon: LucideIcon }[] = [
  { key: 'search_knowledge', name: 'Knowledge search', desc: 'Search your uploaded documents', icon: Search },
  { key: 'calendar', name: 'Calendar', desc: 'Read availability, create events', icon: Calendar },
  { key: 'email', name: 'Email', desc: 'Read, draft and send — with approval', icon: Mail },
  { key: 'web', name: 'Web search', desc: 'Look things up online', icon: Globe },
  { key: 'files', name: 'Files', desc: 'Read and write files', icon: FileText },
]

const MODELS = [
  { id: 'sage-pro', name: 'Sage Pro', price: '$3 / Mtok' },
  { id: 'sage-mini', name: 'Sage Mini', price: '$0.4 / Mtok' },
  { id: 'sage-reason', name: 'Sage Reason', price: '$8 / Mtok' },
]

const INITIAL_AGENTS: Agent[] = [
  {
    id: 'ag1',
    name: 'Sage',
    subtitle: 'General assistant',
    initials: 'S',
    model: 'sage-pro',
    persona:
      'You are Sage, a calm and precise personal assistant. Lead with the answer, keep it concise, and ask before any irreversible or external action.',
    tools: { search_knowledge: true, calendar: true, email: true, web: true, files: false },
  },
  {
    id: 'ag2',
    name: 'Scout',
    subtitle: 'Research & reading',
    initials: 'Sc',
    model: 'sage-pro',
    persona:
      'You are Scout, a research assistant. Always cite sources, prefer primary literature, and summarize before going deep.',
    tools: { search_knowledge: true, calendar: false, email: false, web: true, files: true },
  },
  {
    id: 'ag3',
    name: 'Ledger',
    subtitle: 'Ops & errands',
    initials: 'L',
    model: 'sage-mini',
    persona:
      'You are Ledger, an operations agent for errands and admin. Be meticulous and always confirm before spending money or sending messages.',
    tools: { search_knowledge: false, calendar: true, email: true, web: false, files: false },
  },
]

export function AgentsView() {
  const [agents, setAgents] = useState(INITIAL_AGENTS)
  const [activeId, setActiveId] = useState('ag1')
  const agent = agents.find((a) => a.id === activeId) ?? agents[0]
  const toolCount = Object.values(agent.tools).filter(Boolean).length

  const patch = (fn: (a: Agent) => Agent) =>
    setAgents((prev) => prev.map((a) => (a.id === agent.id ? fn(a) : a)))

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
            <Button variant="ghost" size="icon" className="size-7" aria-label="New agent">
              <Plus className="size-4" />
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="space-y-0.5 px-2 pb-3">
              {agents.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setActiveId(a.id)}
                  className={cn(
                    'hover:bg-accent flex w-full items-center gap-2.5 rounded-lg border border-transparent p-2 text-left transition-colors',
                    a.id === activeId && 'bg-accent border-border',
                  )}
                >
                  <Avatar className="size-8 rounded-lg">
                    <AvatarFallback className="rounded-lg text-xs">{a.initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{a.name}</div>
                    <div className="text-muted-foreground truncate text-xs">{a.subtitle}</div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* detail */}
        <ScrollArea className="flex-1">
          <div className="mx-auto max-w-2xl px-6 py-8">
            <div className="mb-6 flex items-center gap-3">
              <Avatar className="size-12 rounded-xl">
                <AvatarFallback className="rounded-xl text-lg">{agent.initials}</AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-lg font-semibold">{agent.name}</h2>
                <p className="text-muted-foreground text-sm">{agent.subtitle}</p>
              </div>
            </div>

            <FieldLabel>Persona &amp; instructions</FieldLabel>
            <Textarea
              value={agent.persona}
              onChange={(e) => patch((a) => ({ ...a, persona: e.target.value }))}
              className="mb-6 min-h-24"
            />

            <FieldLabel>Model</FieldLabel>
            <div className="mb-6 flex flex-col gap-2">
              {MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => patch((a) => ({ ...a, model: m.id }))}
                  className={cn(
                    'hover:bg-accent flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors',
                    agent.model === m.id && 'border-primary bg-accent',
                  )}
                >
                  <span
                    className={cn(
                      'flex size-4 items-center justify-center rounded-full border-2',
                      agent.model === m.id ? 'border-primary' : 'border-muted-foreground/40',
                    )}
                  >
                    {agent.model === m.id && <span className="bg-primary size-2 rounded-full" />}
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
            <div className="overflow-hidden rounded-xl border">
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
                      checked={!!agent.tools[t.key]}
                      onCheckedChange={(v) =>
                        patch((a) => ({ ...a, tools: { ...a.tools, [t.key]: v } }))
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
