/**
 * Runtime config. The SPA is client-only: it talks to the Ory Oathkeeper edge
 * (which injects identity from the Kratos session cookie) and the Plano model
 * proxy. Identity is enforced at the edge — the app never sends a user id.
 */
export const config = {
  /** Oathkeeper auth edge — fronts egent-lobehub (/v1/*) and pREST. */
  edgeUrl: import.meta.env.VITE_EDGE_URL ?? 'http://localhost:4455',
  /** Plano model proxy (OpenAI-compatible) — used to list available models. */
  modelProxyUrl: import.meta.env.VITE_MODEL_PROXY_URL ?? 'http://localhost:12000',
  /** Kratos public API base (via the edge). */
  kratosUrl:
    import.meta.env.VITE_KRATOS_URL ?? 'http://localhost:4455/.ory/kratos/public',
} as const
