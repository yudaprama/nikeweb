import { useMemo } from 'react'
import { useChat } from '@ai-sdk/react'
import { PlanoChatTransport } from '@/lib/plano-transport'
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

export function ChatView({ sessionId, model }: ChatViewProps) {
  // Streams from Plano's OpenAI-compatible model proxy via the cookie edge
  // (`/.plano/v1/chat/completions`). The transport translates Plano's OpenAI SSE
  // into the AI-SDK UI-message stream this view renders. Identity is injected by
  // the edge from the Kratos session cookie. The proxy is stateless, so history
  // is sent each turn (messages are not persisted server-side yet — see plan).
  const transport = useMemo(() => new PlanoChatTransport({ model }), [model])

  const { messages, sendMessage, status, stop } = useChat({ id: sessionId, transport })

  const handleSubmit = (msg: PromptInputMessage) => {
    if (!msg.text.trim()) return
    sendMessage({ text: msg.text })
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
