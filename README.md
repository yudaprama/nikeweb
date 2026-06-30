# web — AI Agent Workspace frontend

A **client-side React SPA** (Vite) that serves the existing Go backend (egent-lobehub `/v1/*`,
pREST, Talos, Keto, Kratos via the Oathkeeper edge). Built with **shadcn/ui** + **ai-elements**.
This is the from-scratch fallback frontend described in `../FRONTEND_FROM_SCRATCH_PROMPT.md`.

## Stack
- Vite + React 19 + TypeScript (pure client-side SPA, no SSR)
- shadcn/ui (Tailwind v4) + ai-elements (AI SDK chat surface)
- TanStack Query (server state), AI SDK `useChat` (streaming)

## Develop
```bash
bun install
bun dev              # Vite dev server
bun run typecheck    # tsc -b --force (also runs as the first step of `build`)
bun run build        # tsc -b && vite build
```

## Environment (`.env.local`)
```
# Defaults point at the live hosts (see ../ARCHITECTURE.md). Override locally:
VITE_EDGE_URL=https://backend.getkawai.com      # Oathkeeper edge (egent + pREST)
VITE_MODEL_PROXY_URL=https://api.getkawai.com   # Plano model proxy (/v1/models)
VITE_KRATOS_URL=https://backend.getkawai.com/.ory/kratos/public
```
Identity is enforced at the edge from the Kratos session cookie; the app never sends a user id and
sends `credentials: 'include'` on every backend call.

## What's implemented (M1 — core chat loop)
- Kratos session gate (`src/components/login-gate.tsx`, `src/lib/auth.ts`)
- Conversation sidebar with create/select/delete (`src/components/app-sidebar.tsx`, `src/lib/sessions.ts` → pREST)
- Chat view with streaming, tool-call + reasoning rendering (`src/components/chat-view.tsx`, ai-elements)
- Model picker from the Plano proxy (`src/components/model-picker.tsx`, `src/lib/models.ts`)
- Data clients kept separate: `src/lib/egent.ts` (agent `/v1/*`), `src/lib/prest.ts` (CRUD),
  and `src/lib/muninn.ts` (MuninnDB cognitive memory direct via the edge at `/.muninn/api/*`,
  no egent-lobehub hop — the edge injects identity as the per-user vault)

## Known follow-ups
- **Streaming transport:** `chat-view.tsx` uses the AI SDK `DefaultChatTransport` against
  `/v1/chat/send`. Confirm egent-lobehub's actual stream format and swap to `TextStreamChatTransport`
  or a custom transport if it isn't the AI SDK data-stream protocol.
- Next: M2 (agents & knowledge), M3 (memory & tasks), M4 (usage/billing, API keys). See
  `../FRONTEND_FROM_SCRATCH_PROMPT.md`.
