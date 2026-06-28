import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { prest } from './prest'
import { egent } from './egent'
import { setActiveWorkspace } from './active-workspace'

export interface Workspace {
  id: string
  name: string
  owner_id?: string
  created_at?: string
}

export interface WorkspaceMember {
  workspace_id: string
  user_id: string
  role: string
}

/** Workspaces the caller belongs to (pREST Phase 2 scopes via Keto membership). */
export function useWorkspaces() {
  return useQuery({
    queryKey: ['workspaces'],
    // Listing must not be workspace-scoped — force personal (null) so the
    // membership-union filter applies, not the active-workspace compat filter.
    queryFn: () => prest.list<Workspace>('workspaces', '_order=created_at', null),
  })
}

/** Creates a workspace (dual-write: pREST rows + Keto tuple) and activates it. */
export function useCreateWorkspace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) =>
      egent.json<{ id: string; name: string; role: string }>('/v1/workspaces', {
        method: 'POST',
        body: JSON.stringify({ name }),
      }),
    onSuccess: (ws) => {
      setActiveWorkspace(ws.id)
      qc.invalidateQueries({ queryKey: ['workspaces'] })
    },
  })
}

/** Members of a workspace (owner-manageable). */
export function useWorkspaceMembers(workspaceId: string | null) {
  return useQuery({
    queryKey: ['workspace-members', workspaceId],
    queryFn: () =>
      prest.list<WorkspaceMember>('workspace_members', `workspace_id=$eq.${workspaceId}`, null),
    enabled: !!workspaceId,
  })
}

/** Adds/updates a member (owner-only; enforced server-side via Keto manage). */
export function useAddMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (p: { workspaceId: string; memberId: string; role: 'owner' | 'member' | 'viewer' }) =>
      egent.json('/v1/workspaces/members', { method: 'POST', body: JSON.stringify(p) }),
    onSuccess: (_d, p) =>
      qc.invalidateQueries({ queryKey: ['workspace-members', p.workspaceId] }),
  })
}
