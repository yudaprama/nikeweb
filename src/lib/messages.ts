import { useQuery } from '@tanstack/react-query'
import { prest } from './prest'
import { newId } from './ids'

/**
 * Chat message persistence via pREST (`messages` table). The Plano model proxy
 * is stateless, so we store each turn here for reload. `user_id` is injected by
 * pREST from the Oathkeeper identity header (never sent by the client); the
 * client only mints the primary key (`msg_…`).
 */
export interface MessageRow {
  id: string
  role: string
  content: string | null
  session_id?: string | null
  created_at?: string
}

/** Loads a session's messages in chronological order. */
export function useMessages(sessionId: string | null) {
  return useQuery({
    queryKey: ['messages', sessionId],
    queryFn: () =>
      prest.list<MessageRow>(
        'messages',
        `session_id=$eq.${sessionId}&_order=created_at&_page_size=500`,
      ),
    enabled: !!sessionId,
    // Snapshot once per session open — useChat owns the live thread afterwards.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })
}

/** Persists one message. Best-effort: callers should not block chat on failure. */
export async function saveMessage(input: {
  role: 'user' | 'assistant'
  content: string
  sessionId: string
}): Promise<void> {
  await prest.insert('messages', {
    id: newId('messages'),
    role: input.role,
    content: input.content,
    session_id: input.sessionId,
  })
}
