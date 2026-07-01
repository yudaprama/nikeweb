import type { FileUIPart } from 'ai'
import { AlistClient } from 'alist-kratos-sdk'
import { config } from './config'

/**
 * Chat attachment uploads go through `alist-kratos-sdk`, the typed client for
 * AList behind the Oathkeeper edge. The SDK sends cookie-authenticated requests
 * (the edge injects identity from the Kratos session) and scopes paths to the
 * user's BasePath. AList's `RegisterFileUploadedHook` (alist/cmd/bridge.go)
 * then runs the fileprocessor RAG pipeline so the agent's `knowledge_search`
 * tool can retrieve the file's content.
 *
 * The egent only reads the *text* parts of a message (main.go `messageText`),
 * so we don't ship file bytes in the chat request — we store them here and
 * reference them by name in the message text instead.
 *
 * The client is created lazily and reused so the BasePath (fetched via /api/me)
 * is cached across uploads within a session.
 */
let clientPromise: Promise<AlistClient> | null = null

function getAlistClient(): Promise<AlistClient> {
  if (!clientPromise) {
    // fromKratosSession just constructs a client pointed at the edge + mount
    // prefix; the cookie does the authentication on each request.
    clientPromise = AlistClient.fromKratosSession(
      `${config.edgeUrl}/.assets/alist`,
    ).then((c) => {
      if (!c) throw new Error('No Kratos session — user must be logged in')
      return c
    })
  }
  return clientPromise
}

export async function uploadChatAttachment(file: FileUIPart): Promise<string> {
  if (!file.url) {
    throw new Error('attachment has no url')
  }

  // PromptInput hands us data URLs (converted from blob: URLs at submit time).
  // Decode back to a Blob for the multipart upload body.
  const blob = await (await fetch(file.url)).blob()
  const filename = file.filename ?? 'attachment'
  const client = await getAlistClient()

  // A leading-slash path is forwarded as-is; AList auto-prefixes the user's
  // BasePath server-side. asTask=false → synchronous store (the upload hook
  // still ingests for RAG).
  await client.upload(`/${filename}`, blob, {
    asTask: false,
    contentType: file.mediaType || 'application/octet-stream',
  })

  return filename
}
