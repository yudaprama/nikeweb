import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { prest } from './prest'
import { getActiveWorkspaceId } from './active-workspace'
import { newId } from './ids'

/**
 * User-defined agent configs, stored per user + active workspace via pREST
 * (`agents` table). Plano runs the actual agents; this only persists the
 * config (system prompt, model, and params like enabled tools). The edge
 * scopes rows to the user + active workspace — never send a user_id.
 */
export interface AgentParams {
  tools?: Record<string, boolean>
  [k: string]: unknown
}

export interface AgentRow {
  id: string
  name: string
  description?: string | null
  system_prompt?: string | null
  model?: string | null
  params?: AgentParams | null
  created_at?: string
}

export function useAgents() {
  const workspaceId = getActiveWorkspaceId()
  return useQuery({
    queryKey: ['agents', workspaceId],
    queryFn: () => prest.list<AgentRow>('agents', '_order=created_at'),
  })
}

export function useCreateAgent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { name: string; system_prompt?: string; model?: string; params?: AgentParams }) =>
      prest.insert<AgentRow>('agents', {
        id: newId('agents'),
        name: input.name,
        system_prompt: input.system_prompt ?? '',
        model: input.model ?? '',
        params: input.params ?? {},
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agents'] }),
  })
}

export function useUpdateAgent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; patch: Partial<Omit<AgentRow, 'id'>> }) =>
      prest.update<AgentRow>('agents', `id=$eq.${input.id}`, input.patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agents'] }),
  })
}

export function useDeleteAgent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => prest.remove('agents', `id=$eq.${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agents'] }),
  })
}
