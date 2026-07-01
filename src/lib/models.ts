import { useQuery } from '@tanstack/react-query'
import { config } from './config'
import { useActiveApiKey } from './keys'
import type { ModelInfo } from './types'

/**
 * Lists models configured on the Plano agent orchestrator (:8001) — the same
 * service that handles chat completions. Authenticated with the user's API key
 * (Bearer). The model proxy (:12000) lists upstream provider models, but the
 * orchestrator only routes to its own configured kawai/* models, so we must
 * list from there to avoid "model not found" errors at chat time.
 */
async function listModels(apiKey: string): Promise<ModelInfo[]> {
  const res = await fetch(`${config.agentUrl}/v1/models`, {
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
