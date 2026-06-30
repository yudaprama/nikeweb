import { useRef, useState } from 'react'
import { Upload, FileText, Check, Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { ViewHeader } from '@/components/view-header'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import {
  useFiles,
  useUploadFile,
  useDeleteFile,
  formatSize,
  type KnowledgeFile,
  KNOWLEDGE_UPLOAD_ACCEPT,
  FILEPROCESSOR_SUPPORTED_EXTENSIONS,
} from '@/lib/rag'

const APPS = [
  { id: 'gmail', name: 'Gmail', initial: 'M', tools: '4 tools', desc: 'Read, draft and send email — with approval.', on: true },
  { id: 'gcal', name: 'Google Calendar', initial: 'C', tools: '3 tools', desc: 'Read availability and create events.', on: true },
  { id: 'notion', name: 'Notion', initial: 'N', tools: '5 tools', desc: 'Search and update your workspace pages.', on: false },
  { id: 'gh', name: 'GitHub', initial: 'G', tools: '6 tools', desc: 'Read issues and open pull requests.', on: false },
]

function FilesSection() {
  const { data: files, isLoading, error } = useFiles()
  const upload = useUploadFile()
  const remove = useDeleteFile()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = async (list: FileList | null) => {
    if (!list || list.length === 0) return
    for (const file of Array.from(list)) {
      try {
        await upload.mutateAsync(file)
        toast.success(`Indexed ${file.name}`)
      } catch {
        toast.error(`Could not index ${file.name}`)
      }
    }
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleDelete = async (f: KnowledgeFile) => {
    try {
      await remove.mutateAsync(f.id)
    } catch {
      toast.error('Could not delete file')
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={KNOWLEDGE_UPLOAD_ACCEPT}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={upload.isPending}
        className="hover:border-primary mb-8 w-full rounded-xl border border-dashed py-8 text-center transition-colors disabled:opacity-60"
      >
        <div className="bg-muted mx-auto mb-2.5 flex size-10 items-center justify-center rounded-lg">
          {upload.isPending ? <Loader2 className="size-5 animate-spin" /> : <Upload className="size-5" />}
        </div>
        <div className="text-sm font-medium">
          {upload.isPending ? 'Indexing…' : 'Click to upload'}
        </div>
        <div className="text-muted-foreground mt-0.5 text-xs">
          Supports {FILEPROCESSOR_SUPPORTED_EXTENSIONS.length} fileprocessor types, including PDF, Office, text, image, and video
        </div>
      </button>

      <h3 className="text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-wide">
        Documents{files ? ` · ${files.length}` : ''}
      </h3>
      <div className="mb-8 overflow-hidden rounded-xl border">
        {isLoading ? (
          <div className="space-y-2 p-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : error ? (
          <p className="text-muted-foreground px-4 py-8 text-center text-sm">
            Could not load documents.
          </p>
        ) : !files || files.length === 0 ? (
          <p className="text-muted-foreground px-4 py-8 text-center text-sm">
            No documents yet. Upload one to give your agents knowledge to search.
          </p>
        ) : (
          files.map((d, i) => (
            <div key={d.id}>
              {i > 0 && <Separator />}
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="bg-muted text-muted-foreground flex size-8 items-center justify-center rounded-lg">
                  <FileText className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{d.name}</div>
                  <div className="text-muted-foreground text-xs">
                    {d.file_type} · {formatSize(d.size)}
                  </div>
                </div>
                <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                  <Check className="size-3.5" /> Indexed
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive size-8"
                  aria-label="Delete"
                  disabled={remove.isPending}
                  onClick={() => handleDelete(d)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  )
}

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

          <FilesSection />

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
