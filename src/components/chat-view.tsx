import { useMemo } from 'react'
import { useChat } from '@ai-sdk/react'
import type { UIMessage } from 'ai'
import { PlanoChatTransport } from '@/lib/plano-transport'
import { useMessages, saveMessage, type MessageRow } from '@/lib/messages'
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation'
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message'
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/components/ai-elements/reasoning'
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from '@/components/ai-elements/tool'
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  PromptInputSubmit,
  type PromptInputMessage,
} from '@/components/ai-elements/prompt-input'

interface ChatViewProps {
  sessionId: string
  model?: string
}

/** Concatenates the text parts of a UI message. */
function textOf(message: { parts: Array<{ type: string; text?: string }> }): string {
  return message.parts
    .filter((p) => p.type === 'text')
    .map((p) => p.text ?? '')
    .join('')
}

/** pREST rows → AI-SDK UI messages for seeding the thread. */
function toUIMessages(rows: MessageRow[]): UIMessage[] {
  return rows.map((r) => ({
    id: r.id,
    role: r.role === 'assistant' ? 'assistant' : r.role === 'system' ? 'system' : 'user',
    parts: [{ type: 'text' as const, text: r.content ?? '' }],
  }))
}

/**
 * Loads the persisted history for the session, then mounts the live thread once.
 * ChatView is keyed by session in ChatPage, so this remounts per conversation.
 */
export function ChatView({ sessionId, model }: ChatViewProps) {
  const { data, isLoading } = useMessages(sessionId)

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
        Loading conversation…
      </div>
    )
  }

  return (
    <ChatThread
      sessionId={sessionId}
      model={model}
      initialMessages={toUIMessages(data ?? [])}
    />
  )
}

interface ChatThreadProps extends ChatViewProps {
  initialMessages: UIMessage[]
}

function ChatThread({ sessionId, model, initialMessages }: ChatThreadProps) {
  // Streams from Plano's OpenAI-compatible model proxy with the user's API key
  // (see plano-transport). The proxy is stateless, so each completed turn is
  // persisted to pREST (lib/messages) for reload — best-effort, never blocking.
  const transport = useMemo(() => new PlanoChatTransport({ model }), [model])

  const { messages, sendMessage, status, stop } = useChat({
    id: sessionId,
    transport,
    messages: initialMessages,
    onFinish: ({ message }) => {
      const text = textOf(message)
      if (message.role === 'assistant' && text) {
        void saveMessage({ role: 'assistant', content: text, sessionId }).catch((e) =>
          console.error('persist assistant message failed', e),
        )
      }
    },
  })

  const handleSubmit = (msg: PromptInputMessage) => {
    const text = msg.text.trim()
    if (!text) return
    void saveMessage({ role: 'user', content: text, sessionId }).catch((e) =>
      console.error('persist user message failed', e),
    )
    sendMessage({ text })
  }

  return (
    <div className="flex h-full flex-col">
      <Conversation className="flex-1">
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              title="Start the conversation"
              description="Ask the agent anything. It can use tools, search your knowledge, and run tasks."
            />
          ) : (
            messages.map((message) => (
              <Message from={message.role} key={message.id}>
                <MessageContent>
                  {message.parts.map((part, i) => {
                    const key = `${message.id}-${i}`
                    switch (part.type) {
                      case 'text':
                        return <MessageResponse key={key}>{part.text}</MessageResponse>
                      case 'reasoning':
                        return (
                          <Reasoning key={key}>
                            <ReasoningTrigger />
                            <ReasoningContent>{part.text}</ReasoningContent>
                          </Reasoning>
                        )
                      default:
                        if (part.type.startsWith('tool-')) {
                          // Tool invocation part (tool-<name>)
                          const tp = part as unknown as {
                            type: string
                            state?: string
                            input?: unknown
                            output?: unknown
                            errorText?: string
                          }
                          return (
                            <Tool key={key}>
                              <ToolHeader type={tp.type as `tool-${string}`} state={tp.state as never} />
                              <ToolContent>
                                <ToolInput input={tp.input} />
                                <ToolOutput output={tp.output} errorText={tp.errorText} />
                              </ToolContent>
                            </Tool>
                          )
                        }
                        return null
                    }
                  })}
                </MessageContent>
              </Message>
            ))
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t p-4">
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputBody>
            <PromptInputTextarea placeholder="Send a message…" />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools />
            <PromptInputSubmit status={status} onStop={stop} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  )
}
