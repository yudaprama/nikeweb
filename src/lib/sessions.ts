import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { prest } from './prest'
import { newId } from './ids'
import type { Session } from './types'

const TABLE = 'sessions'

export function useSessions() {
  return useQuery({
    queryKey: ['sessions'],
    queryFn: () => prest.list<Session>(TABLE, '_order=-updated_at&_page_size=100'),
  })
}

export function useCreateSession() {
  const qc = useQueryClient()
  return useMutation({
    // pREST runs raw SQL (no Drizzle $defaultFn), so mint the id client-side.
    // user_id + workspace_id are injected by pREST from the Oathkeeper identity.
    mutationFn: (title: string) =>
      prest.insert<Session>(TABLE, { id: newId('sessions'), title }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  })
}

export function useRenameSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      prest.update<Session>(TABLE, `id=${id}`, { title }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  })
}

export function useDeleteSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => prest.remove(TABLE, `id=${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  })
}
