import { useMemo, useState } from 'react'
import { Plus, Trash2, Search, Loader2 } from 'lucide-react'
import { ViewHeader } from '@/components/view-header'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { useMemories, useRecall, useRemember, useForget } from '@/lib/muninn'

/** Common shape for rendering both list items (Engram) and recall hits (Recollection). */
interface MemoryItem {
  id: string
  concept: string
  content: string
}

export function MemoryView() {
  const [query, setQuery] = useState('')
  const trimmed = query.trim()
  const searching = trimmed.length > 0

  const list = useMemories()
  const recall = useRecall(trimmed)
  const remember = useRemember()
  const forget = useForget()

  const [adding, setAdding] = useState(false)
  const [concept, setConcept] = useState('')
  const [content, setContent] = useState('')

  const active = searching ? recall : list
  const items: MemoryItem[] = useMemo(
    () => (active.data ?? []).map((m) => ({ id: m.id, concept: m.concept, content: m.content })),
    [active.data],
  )

  const submitAdd = async () => {
    const c = content.trim()
    if (!c) return
    await remember.mutateAsync({ concept: concept.trim() || 'note', content: c })
    setConcept('')
    setContent('')
    setAdding(false)
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ViewHeader title="Memory">
        <Button size="sm" className="gap-2" onClick={() => setAdding((v) => !v)}>
          <Plus className="size-4" />
          Add memory
        </Button>
      </ViewHeader>
      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-2xl px-6 py-8">
          <p className="text-muted-foreground mb-4 max-w-md text-sm">
            What your agents remember about you, in cognitive memory. Search recalls by meaning;
            add or remove anything — you're always in control.
          </p>

          <div className="relative mb-4">
            <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search memories by meaning…"
              className="pl-8"
            />
          </div>

          {adding && (
            <Card className="mb-4">
              <CardContent className="flex flex-col gap-2 px-4 py-3">
                <Input
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  placeholder="Label (e.g. preference, schedule)"
                />
                <Textarea
                  autoFocus
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="What should be remembered?"
                  className="min-h-14"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={submitAdd} disabled={!content.trim() || remember.isPending}>
                    {remember.isPending ? 'Saving…' : 'Save'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setAdding(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {active.isLoading ? (
            <div className="text-muted-foreground flex items-center gap-2 py-8 text-sm">
              <Loader2 className="size-4 animate-spin" />
              {searching ? 'Recalling…' : 'Loading memories…'}
            </div>
          ) : active.isError ? (
            <p className="text-destructive py-8 text-sm">
              Couldn't load memories. {(active.error as Error)?.message}
            </p>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground py-8 text-sm">
              {searching ? 'No memories match that.' : 'No memories yet.'}
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {items.map((m) => (
                <Card key={m.id}>
                  <CardContent className="px-4">
                    <div className="mb-2 flex items-center gap-2">
                      <Badge variant="secondary">{m.concept}</Badge>
                      <div className="flex-1" />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive size-7"
                        aria-label="Delete"
                        disabled={forget.isPending}
                        onClick={() => forget.mutate(m.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                    <p className="text-sm leading-relaxed">{m.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
