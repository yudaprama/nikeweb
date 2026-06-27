/**
 * Runtime config. The SPA is client-only: it talks to the Ory Oathkeeper edge
 * (which injects identity from the Kratos session cookie) and the Plano model
 * proxy. Identity is enforced at the edge — the app never sends a user id.
 */
export const config = {
  /** Oathkeeper auth edge — fronts egent-lobehub (/v1/*) and pREST. */
  edgeUrl: import.meta.env.VITE_EDGE_URL ?? 'https://backend.getkawai.com',
  /** Plano model proxy (OpenAI-compatible) — used to list available models. */
  modelProxyUrl: import.meta.env.VITE_MODEL_PROXY_URL ?? 'https://api.getkawai.com',
  /** Kratos public API base (via the edge). */
  kratosUrl:
    import.meta.env.VITE_KRATOS_URL ?? 'https://backend.getkawai.com/.ory/kratos/public',
} as const
