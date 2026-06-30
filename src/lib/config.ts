/**
 * Runtime config. The SPA is client-only: it talks to the Ory Oathkeeper edge
 * (which injects identity from the Kratos session cookie) and the Plano model
 * proxy. Identity is enforced at the edge — the app never sends a user id.
 */
export const config = {
  /** Oathkeeper auth edge — fronts egent-lobehub (/v1/*) and pREST. */
  edgeUrl: import.meta.env.VITE_EDGE_URL ?? 'https://backend.getkawai.com',
  /**
   * Plano model proxy (OpenAI-compatible). The SPA calls it cross-origin with an
   * `Authorization: Bearer <api-key>` header — Plano's :12000 listener now allows
   * CORS for this origin. Used for the model list (`/v1/models`) only; chat goes
   * through the agent orchestrator below.
   */
  modelProxyUrl: import.meta.env.VITE_MODEL_PROXY_URL ?? 'https://api.getkawai.com',
  /**
   * Plano agent orchestrator (:8001). Plano's Rust orchestrator picks one of the
   * 20 routable agents per turn and streams its OpenAI-SSE response back to the
   * client as a transparent byte-level passthrough (response.rs
   * `create_streaming_response`), so the wire format is identical to the model
   * proxy. Auth is identical too: `Authorization: Bearer <api-key>` → ext_authz
   * (Talos verify) → `x-arch-actor-id` injection at the edge. This is where chat
   * completions are now sent so turns run through an agent (with the shared
   * memory + knowledge tools on the default agent).
   */
  agentUrl: import.meta.env.VITE_AGENT_URL ?? 'https://agent.getkawai.com',
  /** Kratos public API base (via the edge). */
  kratosUrl:
    import.meta.env.VITE_KRATOS_URL ?? 'https://backend.getkawai.com/.ory/kratos/public',
} as const
