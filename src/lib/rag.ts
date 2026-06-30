import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { prest } from './prest'
import { config } from './config'
import { getActiveWorkspaceId } from './active-workspace'

/**
 * Knowledge files for RAG. Listing + delete go through pREST (`files` table,
 * scoped to the user + active workspace by the edge). Upload goes to AList
 * (`PUT /.assets/alist/api/fs/put` via the edge): AList stores the file and its
 * `RegisterFileUploadedHook` runs the fileprocessor RAG pipeline — chunk + embed
 * (1024-dim) + persist into the same `public.files/file_chunks/embeddings` store
 * the agent's `knowledge_search` tool reads. The edge injects identity, which
 * AList turns into `kratos_identity_id` to scope ingest per user.
 *
 * This handles real files (incl. PDF/DOCX via fileprocessor loaders), replacing
 * the egent inline-text endpoint.
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

/** Uploads a file to AList, which ingests it into the RAG store via its hook. */
export function useUploadFile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      // File-Path is URL-escaped and joined to the user's AList base path
      // (provisioned root mount "/"). As-Task=false → synchronous store; the
      // upload hook then ingests for RAG.
      const res = await fetch(`${config.edgeUrl}/.assets/alist/api/fs/put`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'File-Path': encodeURIComponent(`/${file.name}`),
          'Content-Type': file.type || 'application/octet-stream',
          'As-Task': 'false',
        },
        body: file,
      })
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new Error(`alist upload ${res.status}: ${body || res.statusText}`)
      }
      return (await res.json().catch(() => ({}))) as { code?: number; message?: string }
    },
    // RAG ingest runs in AList's upload hook, so the `files` row appears shortly
    // after; invalidate now and let the next refetch pick it up.
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
