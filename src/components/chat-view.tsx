import { useMemo, useRef } from 'react'
import { useChat } from '@ai-sdk/react'
import type { UIMessage } from 'ai'
import { PlanoChatTransport } from '@/lib/plano-transport'
import { useMessages, saveMessage, type MessageRow, type PersistedToolPart } from '@/lib/messages'
import { useRenameSession } from '@/lib/sessions'
import { generateConversationTitle } from '@/lib/title'
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

/** Concatenates the reasoning parts of a UI message (empty if none). */
function reasoningOf(message: { parts: Array<{ type: string; text?: string }> }): string {
  return message.parts
    .filter((p) => p.type === 'reasoning')
    .map((p) => p.text ?? '')
    .join('')
}

/** Extracts the tool-invocation parts of a UI message for persistence. */
function toolsOf(message: { parts: Array<{ type: string }> }): PersistedToolPart[] {
  return message.parts
    .filter((p) => p.type.startsWith('tool-'))
    .map((p) => {
      const tp = p as PersistedToolPart
      return {
        type: tp.type,
        state: tp.state,
        input: tp.input,
        output: tp.output,
        errorText: tp.errorText,
      }
    })
}

/** pREST rows → AI-SDK UI messages for seeding the thread. Rehydrates the
 * persisted reasoning + tool parts so reloaded conversations show them. */
function toUIMessages(rows: MessageRow[]): UIMessage[] {
  return rows.map((r) => {
    const parts: UIMessage['parts'] = [{ type: 'text', text: r.content ?? '' }]
    if (r.reasoning) {
      parts.push({ type: 'reasoning', text: r.reasoning } as UIMessage['parts'][number])
    }
    for (const t of r.tools ?? []) {
      parts.push(t as unknown as UIMessage['parts'][number])
    }
    return {
      id: r.id,
      role: r.role === 'assistant' ? 'assistant' : r.role === 'system' ? 'system' : 'user',
      parts,
    }
  })
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
  // Streams from Plano's agent orchestrator via streamText() + an OpenAI-
  // compatible provider (see plano-transport). Tool-calls and reasoning are
  // parsed natively by the provider. Each completed turn is persisted to pREST
  // (lib/messages) for reload — best-effort, never blocking the chat.
  const transport = useMemo(() => new PlanoChatTransport({ model }), [model])

  const renameSession = useRenameSession()
  // Only fresh conversations (no seeded history) get an auto-generated title.
  const canAutoTitle = initialMessages.length === 0
  // Guards so the title is generated exactly once per conversation.
  const titledRef = useRef(false)
  const firstUserTextRef = useRef<string | null>(null)

  const { messages, sendMessage, status, stop } = useChat({
    id: sessionId,
    transport,
    messages: initialMessages,
    onFinish: ({ message }) => {
      const text = textOf(message)
      if (message.role === 'assistant' && text) {
        void saveMessage({
          role: 'assistant',
          content: text,
          sessionId,
          reasoning: reasoningOf(message) || undefined,
          tools: toolsOf(message),
        }).catch((e) => console.error('persist assistant message failed', e))

        // After the first assistant reply, summarize the exchange into a title
        // and rename the session so the sidebar/header updates. Runs once.
        if (canAutoTitle && !titledRef.current && firstUserTextRef.current) {
          titledRef.current = true
          void generateConversationTitle(firstUserTextRef.current, text)
            .then((title) => {
              if (title) renameSession.mutate({ id: sessionId, title })
            })
            .catch((e) => console.error('generate conversation title failed', e))
        }
      }
    },
  })

  const handleSubmit = (msg: PromptInputMessage) => {
    const text = msg.text.trim()
    if (!text) return
    if (firstUserTextRef.current === null) firstUserTextRef.current = text
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
