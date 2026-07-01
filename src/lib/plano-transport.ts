import { DefaultChatTransport, convertToModelMessages, type UIMessage } from 'ai'
import { config } from './config'
import { getActiveApiKey } from './keys'

export class PlanoChatTransport extends DefaultChatTransport<UIMessage> {
  constructor(opts: { model?: string } = {}) {
    super({
      api: `${config.agentUrl}/v1/chat/completions`,
      credentials: 'omit',
      prepareSendMessagesRequest: async ({ messages }) => {
        const apiKey = getActiveApiKey()
        if (!apiKey) {
          throw new Error('No API key. Generate one in Settings → API keys first.')
        }

        return {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          body: {
            model: opts.model ?? 'kawai-pro-max',
            stream: true,
            messages: await convertToModelMessages(messages),
          },
        }
      },
      prepareReconnectToStreamRequest: async () => {
        const apiKey = getActiveApiKey()
        if (!apiKey) {
          throw new Error('No API key. Generate one in Settings → API keys first.')
        }

        return {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        }
      },
      fetch: async (input, init) => {
        const response = await fetch(input, {
          ...init,
          headers: {
            Accept: 'text/event-stream',
            ...(init?.headers ?? {}),
          },
        })

        if (!response.ok) {
          throw new Error((await response.text()) || 'Failed to fetch the chat response.')
        }

        if (!response.body) {
          throw new Error('The response body is empty.')
        }

        return new Response(response.body.pipeThrough(openAIStreamToUIMessageChunks()), {
          status: response.status,
          statusText: response.statusText,
          headers: {
            'content-type': 'text/event-stream',
          },
        })
      },
    })
  }
}

type OpenAIStreamChoice = {
  delta?: {
    content?: string | null
    reasoning?: string | null
    reasoning_content?: string | null
    tool_calls?: Array<{
      index?: number
      id?: string
      function?: {
        name?: string
        arguments?: string
      }
    }>
  }
  finish_reason?: string | null
}

type OpenAIStreamChunk = {
  choices?: OpenAIStreamChoice[]
}

type PendingToolCall = {
  id?: string
  name?: string
  input: string
  started: boolean
}

function openAIStreamToUIMessageChunks(): TransformStream<Uint8Array, Uint8Array> {
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  let buffer = ''
  let started = false
  let textStarted = false
  let reasoningStarted = false
  let finishReason: string | undefined
  const pendingToolCalls = new Map<number, PendingToolCall>()

  const emit = (controller: TransformStreamDefaultController<Uint8Array>, chunk: unknown) => {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`))
  }

  const normalizeFinishReason = (value: string | null | undefined) => {
    switch (value) {
      case 'stop':
      case 'length':
      case 'content_filter':
      case 'tool_calls':
        return value === 'content_filter' ? 'content-filter' : value
      default:
        return value ? 'other' : undefined
    }
  }

  const flushEvent = (controller: TransformStreamDefaultController<Uint8Array>, rawEvent: string) => {
    const lines = rawEvent
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim())

    if (lines.length === 0) return
    const payload = lines.join('\n')
    if (!payload) return

    if (!started) {
      emit(controller, { type: 'start' })
      started = true
    }

    if (payload === '[DONE]') {
      if (reasoningStarted) {
        emit(controller, { type: 'reasoning-end', id: 'reasoning-0' })
        reasoningStarted = false
      }
      if (textStarted) {
        emit(controller, { type: 'text-end', id: 'text-0' })
        textStarted = false
      }
      for (const toolCall of pendingToolCalls.values()) {
        if (toolCall.id && toolCall.name) {
          emit(controller, {
            type: 'tool-input-available',
            toolCallId: toolCall.id,
            toolName: toolCall.name,
            input: safeParseJson(toolCall.input),
          })
        }
      }
      pendingToolCalls.clear()
      emit(controller, { type: 'finish', finishReason: finishReason ?? 'stop' })
      return
    }

    const chunk = safeParseChunk(payload)
    if (!chunk?.choices?.length) return

    for (const choice of chunk.choices) {
      const delta = choice.delta
      if (!delta) continue

      const reasoning = delta.reasoning_content ?? delta.reasoning
      if (reasoning) {
        if (!reasoningStarted) {
          emit(controller, { type: 'reasoning-start', id: 'reasoning-0' })
          reasoningStarted = true
        }
        emit(controller, { type: 'reasoning-delta', id: 'reasoning-0', delta: reasoning })
      }

      if (delta.content) {
        if (reasoningStarted) {
          emit(controller, { type: 'reasoning-end', id: 'reasoning-0' })
          reasoningStarted = false
        }
        if (!textStarted) {
          emit(controller, { type: 'text-start', id: 'text-0' })
          textStarted = true
        }
        emit(controller, { type: 'text-delta', id: 'text-0', delta: delta.content })
      }

      if (delta.tool_calls) {
        if (textStarted) {
          emit(controller, { type: 'text-end', id: 'text-0' })
          textStarted = false
        }
        for (const toolCallDelta of delta.tool_calls) {
          const index = toolCallDelta.index ?? 0
          const current = pendingToolCalls.get(index) ?? { input: '', started: false }
          current.id = toolCallDelta.id ?? current.id
          current.name = toolCallDelta.function?.name ?? current.name
          current.input += toolCallDelta.function?.arguments ?? ''
          pendingToolCalls.set(index, current)

          if (current.id && current.name && !current.started) {
            emit(controller, {
              type: 'tool-input-start',
              toolCallId: current.id,
              toolName: current.name,
            })
            current.started = true
          }

          if (current.id && toolCallDelta.function?.arguments) {
            emit(controller, {
              type: 'tool-input-delta',
              toolCallId: current.id,
              inputTextDelta: toolCallDelta.function.arguments,
            })
          }
        }
      }

      const normalized = normalizeFinishReason(choice.finish_reason)
      if (normalized) {
        finishReason = normalized
      }
    }
  }

  return new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true })
      const events = buffer.split('\n\n')
      buffer = events.pop() ?? ''
      for (const event of events) {
        flushEvent(controller, event)
      }
    },
    flush(controller) {
      const remaining = buffer.trim()
      if (remaining) {
        flushEvent(controller, remaining)
      }
    },
  })
}

function safeParseChunk(payload: string): OpenAIStreamChunk | null {
  try {
    return JSON.parse(payload) as OpenAIStreamChunk
  } catch {
    return null
  }
}

function safeParseJson(input: string): unknown {
  try {
    return JSON.parse(input)
  } catch {
    return input
  }
}
