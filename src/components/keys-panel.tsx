import { useState } from 'react'
import { Plus, KeyRound, Trash2, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  useKeys,
  useCreateKey,
  useRevokeKey,
  useActiveKey,
  clearActiveKey,
  type ApiKeyInfo,
} from '@/lib/keys'

function formatDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString()
}

export function KeysPanel() {
  const { data: keys, isLoading, error } = useKeys()
  const createKey = useCreateKey()
  const revokeKey = useRevokeKey()
  const activeKey = useActiveKey()
  const [newSecret, setNewSecret] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [name, setName] = useState('')
  // Talos forbids non-expiring keys; the project max is 1 year, so that's the
  // closest to "never" and our default. Value is a protobuf Duration string.
  const [ttl, setTtl] = useState('31536000s')

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const issued = await createKey.mutateAsync({ name: name.trim() || undefined, ttl })
      setNewSecret(issued.secret)
      setCopied(false)
      setDialogOpen(false)
      setName('')
    } catch {
      toast.error('Could not create key')
    }
  }

  const handleCopy = async () => {
    if (!newSecret) return
    await navigator.clipboard.writeText(newSecret)
    setCopied(true)
    toast.success('Key copied')
  }

  const handleRevoke = async (k: ApiKeyInfo) => {
    try {
      await revokeKey.mutateAsync(k.keyId)
      if (activeKey?.keyId === k.keyId) clearActiveKey()
    } catch {
      toast.error('Could not revoke key')
    }
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="text-muted-foreground max-w-sm text-sm">
          Generate a personal API key — the chat uses it to reach the model. Treat it like a
          password; it only spends your own balance.
        </p>
        <Button
          size="sm"
          className="shrink-0 gap-2"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="size-4" />
          Create key
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>Create API key</DialogTitle>
              <DialogDescription>
                Name the key and pick how long it stays valid. The secret is shown only once
                after creation.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Name</label>
                <Input
                  autoFocus
                  placeholder="web-app"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={64}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Expires</label>
                <Select value={ttl} onValueChange={(v) => v && setTtl(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="604800s">7 days</SelectItem>
                    <SelectItem value="2592000s">30 days</SelectItem>
                    <SelectItem value="7776000s">90 days</SelectItem>
                    <SelectItem value="31536000s">1 year (max)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-xs">
                  Talos doesn't allow non-expiring keys — 1 year is the project maximum.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDialogOpen(false)}
                disabled={createKey.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createKey.isPending}>
                {createKey.isPending ? 'Creating…' : 'Create key'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* The freshly-minted secret, shown exactly once. */}
      {newSecret && (
        <div className="border-primary/40 bg-primary/5 mb-4 rounded-xl border p-4">
          <div className="mb-2 text-sm font-medium">Copy your new key now — it won't be shown again.</div>
          <div className="flex items-center gap-2">
            <code className="bg-background min-w-0 flex-1 truncate rounded-md border px-2.5 py-1.5 font-mono text-xs">
              {newSecret}
            </code>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleCopy}>
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <button
            className="text-muted-foreground mt-2 text-xs underline"
            onClick={() => setNewSecret(null)}
          >
            Done
          </button>
        </div>
      )}

      {/* Which key the chat is currently using. */}
      {activeKey ? (
        <div className="mb-4 flex items-center gap-2 text-sm">
          <Badge variant="secondary">Active</Badge>
          <span className="text-muted-foreground">
            Chat uses <span className="font-medium">{activeKey.name}</span> ·{' '}
            <span className="font-mono">••••{activeKey.secret.slice(-4)}</span>
          </span>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={clearActiveKey}>
            Clear
          </Button>
        </div>
      ) : (
        <p className="text-muted-foreground mb-4 text-sm">
          No active key — generate one to start chatting.
        </p>
      )}

      <div className="overflow-hidden rounded-xl border">
        {isLoading ? (
          <div className="space-y-2 p-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : error ? (
          <p className="text-muted-foreground px-4 py-8 text-center text-sm">
            Could not load keys.
          </p>
        ) : !keys || keys.length === 0 ? (
          <p className="text-muted-foreground px-4 py-8 text-center text-sm">
            No keys yet. Create one to get started.
          </p>
        ) : (
          keys.map((k, i) => (
            <div key={k.keyId}>
              {i > 0 && <Separator />}
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="bg-muted text-muted-foreground flex size-8 items-center justify-center rounded-lg">
                  <KeyRound className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{k.name}</div>
                  <div className="text-muted-foreground font-mono text-xs">
                    {k.keyId.slice(0, 8)}…
                  </div>
                </div>
                <span className="text-muted-foreground hidden text-xs sm:inline">
                  {formatDate(k.createTime)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive size-8"
                  aria-label="Revoke"
                  disabled={revokeKey.isPending}
                  onClick={() => handleRevoke(k)}
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
