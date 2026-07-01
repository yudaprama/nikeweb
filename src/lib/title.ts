import { config } from './config'
import { getActiveApiKey } from './keys'

/**
 * Generates a short conversation title from the first user message and the
 * assistant reply by calling Plano's model proxy (api.getkawai.com) with a
 * non-streaming completion. Best-effort: any failure returns null so the caller
 * keeps the default "New conversation" title.
 */
export async function generateConversationTitle(
  userText: string,
  assistantText: string,
): Promise<string | null> {
  const apiKey = getActiveApiKey()
  if (!apiKey) return null

  try {
    const res = await fetch(`${config.modelProxyUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'kawai-pro-max',
        stream: false,
        max_tokens: 24,
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content:
              'Generate a concise 3-6 word title summarizing the conversation below. Reply with the title only — no quotes, no trailing punctuation, no prefix like "Title:".',
          },
          {
            role: 'user',
            content: `User: ${userText.slice(0, 1000)}\n\nAssistant: ${assistantText.slice(0, 1000)}`,
          },
        ],
      }),
    })
    if (!res.ok) return null
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>
    }
    const raw = json.choices?.[0]?.message?.content ?? ''
    const title = raw
      .trim()
      .replace(/^["'`]+|["'`.]+$/g, '')
      .replace(/^title:\s*/i, '')
      .slice(0, 80)
      .trim()
    return title || null
  } catch {
    return null
  }
}
