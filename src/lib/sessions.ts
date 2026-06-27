import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { prest } from './prest'
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
    mutationFn: (title: string) => prest.insert<Session>(TABLE, { title }),
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
