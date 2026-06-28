import { useState } from 'react'
import { UserPlus, User, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useSession } from '@/lib/auth'
import {
  useWorkspaceMembers,
  useAddMember,
  useRemoveMember,
  type WorkspaceMember,
} from '@/lib/workspaces'

type Role = 'owner' | 'member' | 'viewer'

/**
 * Members of the active workspace, with invite (memberId + role) and remove.
 * The server enforces owner-only mutation (Keto `manage`); failures surface as
 * toasts. Mirrors the keys-panel loading/empty/error pattern.
 */
export function WorkspaceMembersPanel({ workspaceId }: { workspaceId: string }) {
  const { data: session } = useSession()
  const myId = session?.identity?.id
  const { data: members, isLoading, error } = useWorkspaceMembers(workspaceId)
  const addMember = useAddMember()
  const removeMember = useRemoveMember()
  const [memberId, setMemberId] = useState('')
  const [role, setRole] = useState<Role>('member')

  const handleInvite = async () => {
    const id = memberId.trim()
    if (!id) return
    try {
      await addMember.mutateAsync({ workspaceId, memberId: id, role })
      setMemberId('')
      toast.success('Member added')
    } catch {
      toast.error('Could not add member (owners only)')
    }
  }

  const handleRemove = async (m: WorkspaceMember) => {
    try {
      await removeMember.mutateAsync({ workspaceId, memberId: m.user_id })
    } catch {
      toast.error('Could not remove member')
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-end gap-2">
        <div className="flex-1">
          <label className="text-muted-foreground mb-1 block text-xs">Invite by user ID</label>
          <Input
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            placeholder="Kratos identity id"
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleInvite()
            }}
          />
        </div>
        <Select value={role} onValueChange={(v) => setRole(v as Role)}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="owner">Owner</SelectItem>
            <SelectItem value="member">Member</SelectItem>
            <SelectItem value="viewer">Viewer</SelectItem>
          </SelectContent>
        </Select>
        <Button className="gap-1.5" onClick={handleInvite} disabled={addMember.isPending}>
          <UserPlus className="size-4" />
          Add
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border">
        {isLoading ? (
          <div className="space-y-2 p-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : error ? (
          <p className="text-muted-foreground px-4 py-8 text-center text-sm">
            Could not load members.
          </p>
        ) : !members || members.length === 0 ? (
          <p className="text-muted-foreground px-4 py-8 text-center text-sm">No members yet.</p>
        ) : (
          members.map((m, i) => (
            <div key={m.user_id}>
              {i > 0 && <Separator />}
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="bg-muted text-muted-foreground flex size-8 items-center justify-center rounded-lg">
                  <User className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span className="truncate font-mono text-xs">{m.user_id}</span>
                    {m.user_id === myId && (
                      <Badge variant="secondary" className="text-[10px]">
                        You
                      </Badge>
                    )}
                  </div>
                  <div className="text-muted-foreground text-xs capitalize">{m.role}</div>
                </div>
                {m.user_id !== myId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive size-8"
                    aria-label="Remove member"
                    disabled={removeMember.isPending}
                    onClick={() => handleRemove(m)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
