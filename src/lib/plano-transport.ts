import type { ChatTransport, UIMessage } from 'ai'
import { convertToModelMessages, streamText, toUIMessageStream } from 'ai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { config } from './config'
import { getActiveApiKey } from './keys'

/**
 * AI-SDK ChatTransport that streams from Plano's agent orchestrator — entirely
 * client-side, no BFF/serverless function.
 *
 * Instead of hand-parsing OpenAI SSE deltas (the old approach that missed
 * tool-calls), this delegates to streamText() with an @ai-sdk/openai-compatible
 * provider. The provider calls Plano's CORS-enabled /v1/chat/completions via
 * fetch, parses the OpenAI stream natively (text, reasoning, tool-call deltas),
 * and toUIMessageStream() converts the result into the UIMessageChunk stream
 * that useChat consumes.
 *
 * streamText() and the provider are pure fetch-based utilities — nothing here
 * is server-only. The API key is read from localStorage at call time, same
 * security model as before.
 */
export class PlanoChatTransport implements ChatTransport<UIMessage> {
  private readonly opts: { model?: string }

  constructor(opts: { model?: string } = {}) {
    this.opts = opts
  }

  async sendMessages(
    options: Parameters<ChatTransport<UIMessage>['sendMessages']>[0],
  ) {
    const { messages, abortSignal } = options
    const apiKey = getActiveApiKey()
    if (!apiKey) {
      throw new Error('No API key. Generate one in Settings → API keys first.')
    }

    const provider = createOpenAICompatible({
      name: 'plano',
      baseURL: `${config.agentUrl}/v1`,
      apiKey,
    })

    const result = streamText({
      model: provider.chatModel(this.opts.model ?? 'sage-pro'),
      messages: await convertToModelMessages(messages),
      abortSignal,
    })

    return toUIMessageStream({ stream: result.stream })
  }

  async reconnectToStream() {
    return null
  }
}
