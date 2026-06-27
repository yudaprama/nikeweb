import { useState } from 'react'
import { Upload, FileText, Check, Loader2 } from 'lucide-react'
import { ViewHeader } from '@/components/view-header'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'

const DOCS = [
  { id: 'd1', name: 'weekly-review.md', meta: 'Markdown · 12 KB · 1,420 chunks', done: true },
  { id: 'd2', name: 'q3-board-notes.pdf', meta: 'PDF · 2.4 MB · 38 pages', done: true },
  { id: 'd3', name: 'prefs.json', meta: 'JSON · 3 KB', done: true },
  { id: 'd4', name: 'fernweh-research.pdf', meta: 'PDF · 8.1 MB · 64 pages', done: false },
]

const APPS = [
  { id: 'gmail', name: 'Gmail', initial: 'M', tools: '4 tools', desc: 'Read, draft and send email — with approval.', on: true },
  { id: 'gcal', name: 'Google Calendar', initial: 'C', tools: '3 tools', desc: 'Read availability and create events.', on: true },
  { id: 'notion', name: 'Notion', initial: 'N', tools: '5 tools', desc: 'Search and update your workspace pages.', on: false },
  { id: 'gh', name: 'GitHub', initial: 'G', tools: '6 tools', desc: 'Read issues and open pull requests.', on: false },
]

export function KnowledgeView() {
  const [apps, setApps] = useState(APPS)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ViewHeader title="Knowledge" />
      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-3xl px-6 py-8">
          <p className="text-muted-foreground mb-6 max-w-xl text-sm">
            Documents your agents can search, and the apps they can act through. Everything here is
            private to you.
          </p>

          <button className="hover:border-primary mb-8 w-full rounded-xl border border-dashed py-8 text-center transition-colors">
            <div className="bg-muted mx-auto mb-2.5 flex size-10 items-center justify-center rounded-lg">
              <Upload className="size-5" />
            </div>
            <div className="text-sm font-medium">Drop files or click to upload</div>
            <div className="text-muted-foreground mt-0.5 text-xs">
              PDF, Markdown, DOCX, TXT · up to 25MB each
            </div>
          </button>

          <h3 className="text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-wide">
            Documents · {DOCS.length}
          </h3>
          <div className="mb-8 overflow-hidden rounded-xl border">
            {DOCS.map((d, i) => (
              <div key={d.id}>
                {i > 0 && <Separator />}
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="bg-muted text-muted-foreground flex size-8 items-center justify-center rounded-lg">
                    <FileText className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{d.name}</div>
                    <div className="text-muted-foreground text-xs">{d.meta}</div>
                  </div>
                  <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                    {d.done ? (
                      <>
                        <Check className="size-3.5" /> Indexed
                      </>
                    ) : (
                      <>
                        <Loader2 className="size-3.5 animate-spin" /> Processing
                      </>
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <h3 className="text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-wide">
            Connected apps
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {apps.map((app) => (
              <Card key={app.id}>
                <CardContent className="px-4">
                  <div className="mb-2 flex items-center gap-2.5">
                    <Avatar className="size-8 rounded-lg">
                      <AvatarFallback className="rounded-lg text-xs">{app.initial}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{app.name}</div>
                      <div className="text-muted-foreground text-xs">{app.tools}</div>
                    </div>
                    <Switch
                      checked={app.on}
                      onCheckedChange={(v) =>
                        setApps((prev) => prev.map((a) => (a.id === app.id ? { ...a, on: v } : a)))
                      }
                    />
                  </div>
                  <p className="text-muted-foreground text-xs leading-relaxed">{app.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
