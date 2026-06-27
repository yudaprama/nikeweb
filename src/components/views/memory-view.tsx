import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { ViewHeader } from '@/components/view-header'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'

interface Memory {
  id: string
  tag: string
  when: string
  text: string
}

const INITIAL: Memory[] = [
  { id: 'm1', tag: 'Preference', when: 'Updated 2d ago', text: 'Prefers concise answers first, with the option to expand. Dislikes filler and hedging.' },
  { id: 'm2', tag: 'Schedule', when: 'Updated 5d ago', text: 'Most focused 9–11:30am. Protects mornings for deep work; meetings clustered Monday afternoon.' },
  { id: 'm3', tag: 'Context', when: 'Updated 1w ago', text: 'Working on a side project — a travel app currently codenamed "Fernweh". Solo founder.' },
  { id: 'm4', tag: 'Personal', when: 'Updated 2w ago', text: 'Coffee over tea. Lives in a timezone that is UTC−5. Has a dog named Pip.' },
]

export function MemoryView() {
  const [memories, setMemories] = useState(INITIAL)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  const startEdit = (m: Memory) => {
    setEditingId(m.id)
    setDraft(m.text)
  }
  const save = (id: string) => {
    const text = draft.trim()
    setMemories((prev) =>
      text ? prev.map((m) => (m.id === id ? { ...m, text, when: 'Just now' } : m)) : prev.filter((m) => m.id !== id),
    )
    setEditingId(null)
  }
  const add = () => {
    const id = `m${Date.now()}`
    setMemories((prev) => [{ id, tag: 'Note', when: 'Just now', text: '' }, ...prev])
    setEditingId(id)
    setDraft('')
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ViewHeader title="Memory">
        <Button size="sm" className="gap-2" onClick={add}>
          <Plus className="size-4" />
          Add memory
        </Button>
      </ViewHeader>
      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-2xl px-6 py-8">
          <p className="text-muted-foreground mb-6 max-w-md text-sm">
            What your agents remember about you across conversations. Edit or remove anything — you're
            always in control.
          </p>
          <div className="flex flex-col gap-3">
            {memories.map((m) => (
              <Card key={m.id}>
                <CardContent className="px-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Badge variant="secondary">{m.tag}</Badge>
                    <span className="text-muted-foreground text-xs">{m.when}</span>
                    <div className="flex-1" />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      aria-label="Edit"
                      onClick={() => startEdit(m)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive size-7"
                      aria-label="Delete"
                      onClick={() => setMemories((prev) => prev.filter((x) => x.id !== m.id))}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                  {editingId === m.id ? (
                    <div>
                      <Textarea
                        autoFocus
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        className="min-h-14"
                      />
                      <div className="mt-2 flex gap-2">
                        <Button size="sm" onClick={() => save(m.id)}>
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (!m.text) setMemories((prev) => prev.filter((x) => x.id !== m.id))
                            setEditingId(null)
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed">{m.text}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
