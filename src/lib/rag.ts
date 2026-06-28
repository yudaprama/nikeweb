import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { prest } from './prest'
import { egent } from './egent'
import { getActiveWorkspaceId } from './active-workspace'

/**
 * Knowledge files for RAG. Listing + delete go through pREST (`files` table,
 * scoped to the user + active workspace by the edge). Upload goes through
 * egent-lobehub `POST /v1/documents`, which chunks + embeds the text inline so
 * it's searchable by the agent's `knowledge_search` tool immediately.
 *
 * v1 ingests TEXT: the browser reads the file's text and posts it. Binary
 * formats (PDF/DOCX) aren't parsed here yet.
 */
export interface KnowledgeFile {
  id: string
  name: string
  file_type: string
  size: number
  created_at?: string
}

/** Lists the active workspace's knowledge files (newest first). */
export function useFiles() {
  const workspaceId = getActiveWorkspaceId()
  return useQuery({
    queryKey: ['files', workspaceId],
    queryFn: () => prest.list<KnowledgeFile>('files', '_order=-created_at&_page_size=200'),
  })
}

/** Uploads a text/markdown file: reads its content, then ingests via egent. */
export function useUploadFile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const content = await file.text()
      return egent.json<{ fileId: string; name: string; chunks: number }>('/v1/documents', {
        method: 'POST',
        body: JSON.stringify({
          title: file.name,
          content,
          workspaceId: getActiveWorkspaceId() ?? '',
        }),
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['files'] }),
  })
}

/** Deletes a knowledge file row (its chunks fall out of search by file scope). */
export function useDeleteFile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (fileId: string) => prest.remove('files', `id=$eq.${fileId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['files'] }),
  })
}

/** Human-readable byte size. */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
