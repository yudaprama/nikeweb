import type { ChatTransport, UIMessage, UIMessageChunk } from 'ai'
import { config } from './config'
import { getActiveApiKey } from './keys'

/**
 * AI-SDK ChatTransport that streams from Plano's OpenAI-compatible model proxy.
 * The browser calls Plano directly (CORS-enabled) with the user's own API key as
 * a Bearer token — minted in Settings and stored locally (see lib/keys.ts).
 *
 * Plano speaks the OpenAI SSE wire format (`data: {chunk}` … `data: [DONE]`),
 * which `useChat` doesn't understand natively — so this transport translates
 * each `choices[0].delta` into the AI-SDK UI-message stream chunks the chat UI
 * consumes (`start` → `text-start` → `text-delta`… → `text-end` → `finish`),
 * mirroring the framing the built-in TextStreamChatTransport emits.
 *
 * The proxy is stateless, so the full conversation history is sent each call.
 */
export class PlanoChatTransport implements ChatTransport<UIMessage> {
  private readonly opts: { model?: string }

  constructor(opts: { model?: string } = {}) {
    this.opts = opts
  }

  async sendMessages(
    options: Parameters<ChatTransport<UIMessage>['sendMessages']>[0],
  ): Promise<ReadableStream<UIMessageChunk>> {
    const { messages, abortSignal } = options
    const apiKey = getActiveApiKey()
    if (!apiKey) {
      throw new Error('No API key. Generate one in Settings → API keys first.')
    }
    const res = await fetch(`${config.modelProxyUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      signal: abortSignal,
      body: JSON.stringify({
        model: this.opts.model,
        messages: toOpenAIMessages(messages),
        stream: true,
      }),
    })
    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => '')
      throw new Error(`plano chat ${res.status}: ${detail || res.statusText}`)
    }
    return openAISSEToUIMessageStream(res.body)
  }

  // The model proxy has no resumable server-side stream.
  async reconnectToStream(): Promise<ReadableStream<UIMessageChunk> | null> {
    return null
  }
}

/** Flatten UI messages to OpenAI `{ role, content }` (text parts only). */
function toOpenAIMessages(messages: UIMessage[]) {
  return messages.map((m) => ({
    role: m.role,
    content: m.parts
      .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join(''),
  }))
}

/** Parse an OpenAI SSE body into an AI-SDK UI-message chunk stream. */
function openAISSEToUIMessageStream(
  body: ReadableStream<Uint8Array>,
): ReadableStream<UIMessageChunk> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  const TEXT_ID = 'text-1'
  const REASONING_ID = 'reasoning-1'
  let buffer = ''
  let textOpen = false
  let reasoningOpen = false

  return new ReadableStream<UIMessageChunk>({
    start(controller) {
      controller.enqueue({ type: 'start' })
      controller.enqueue({ type: 'start-step' })
    },
    async pull(controller) {
      const { done, value } = await reader.read()
      if (done) {
        if (reasoningOpen) controller.enqueue({ type: 'reasoning-end', id: REASONING_ID })
        if (textOpen) controller.enqueue({ type: 'text-end', id: TEXT_ID })
        controller.enqueue({ type: 'finish-step' })
        controller.enqueue({ type: 'finish' })
        controller.close()
        return
      }

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? '' // keep the trailing partial line

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const data = trimmed.slice(5).trim()
        if (!data || data === '[DONE]') continue

        let json: {
          choices?: Array<{
            delta?: { content?: string; reasoning?: string; reasoning_content?: string }
          }>
        }
        try {
          json = JSON.parse(data)
        } catch {
          continue // ignore malformed/partial chunks
        }

        const delta = json.choices?.[0]?.delta
        if (!delta) continue

        const reasoning = delta.reasoning ?? delta.reasoning_content
        if (reasoning) {
          if (!reasoningOpen) {
            controller.enqueue({ type: 'reasoning-start', id: REASONING_ID })
            reasoningOpen = true
          }
          controller.enqueue({ type: 'reasoning-delta', id: REASONING_ID, delta: reasoning })
        }

        if (delta.content) {
          if (reasoningOpen) {
            controller.enqueue({ type: 'reasoning-end', id: REASONING_ID })
            reasoningOpen = false
          }
          if (!textOpen) {
            controller.enqueue({ type: 'text-start', id: TEXT_ID })
            textOpen = true
          }
          controller.enqueue({ type: 'text-delta', id: TEXT_ID, delta: delta.content })
        }
      }
    },
    async cancel(reason) {
      await reader.cancel(reason)
    },
  })
}
