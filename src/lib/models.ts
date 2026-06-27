import { useQuery } from '@tanstack/react-query'
import { config } from './config'
import type { ModelInfo } from './types'

/** Lists available models from the Plano proxy (OpenAI-compatible /v1/models). */
async function listModels(): Promise<ModelInfo[]> {
  const res = await fetch(`${config.modelProxyUrl}/v1/models`, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`models ${res.status}`)
  const json = (await res.json()) as { data?: Array<{ id: string }> }
  return (json.data ?? []).map((m) => ({ id: m.id, name: m.id }))
}

export function useModels() {
  return useQuery({
    queryKey: ['models'],
    queryFn: listModels,
    staleTime: 5 * 60_000,
    retry: false,
  })
}
