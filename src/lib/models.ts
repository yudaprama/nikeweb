import { useQuery } from '@tanstack/react-query'
import { config } from './config'
import { useActiveApiKey } from './keys'
import type { ModelInfo } from './types'

/**
 * Lists available models from Plano (OpenAI-compatible /v1/models) directly,
 * authenticated with the user's API key (Bearer). Requires an active key — the
 * proxy rejects unauthenticated calls.
 */
async function listModels(apiKey: string): Promise<ModelInfo[]> {
  const res = await fetch(`${config.modelProxyUrl}/v1/models`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${apiKey}` },
  })
  if (!res.ok) throw new Error(`models ${res.status}`)
  const json = (await res.json()) as { data?: Array<{ id: string }> }
  return (json.data ?? []).map((m) => ({ id: m.id, name: m.id }))
}

export function useModels() {
  const apiKey = useActiveApiKey()
  return useQuery({
    queryKey: ['models', apiKey],
    queryFn: () => listModels(apiKey as string),
    enabled: !!apiKey,
    staleTime: 5 * 60_000,
    retry: false,
  })
}
