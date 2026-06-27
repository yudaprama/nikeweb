import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { config } from '@/lib/config'

type FlowKind = 'login' | 'registration'

/** Shown when the flow can't be loaded after one retry — almost always cookies. */
const COOKIE_HINT =
  "Couldn't load the sign-in form. Your browser may be blocking cookies for the " +
  'auth domain (third-party cookies / tracking prevention). Allow cookies for this ' +
  'site and try again.'

/** Subset of the Ory Kratos UI container we render. */
interface UiNode {
  type: string
  group: string
  attributes: {
    node_type?: string
    name?: string
    type?: string
    value?: unknown
    required?: boolean
    disabled?: boolean
    label?: { text?: string }
  }
  meta?: { label?: { text?: string } }
  messages?: { id: number; text: string; type: string }[]
}

interface KratosFlow {
  id: string
  ui: {
    action: string
    method: string
    nodes: UiNode[]
    messages?: { id: number; text: string; type: string }[]
  }
}

const KIND_LABEL: Record<FlowKind, { title: string; cta: string; alt: string; altPath: string }> = {
  login: {
    title: 'Sign in',
    cta: 'Sign in',
    alt: 'Create an account',
    altPath: '/registration',
  },
  registration: {
    title: 'Create account',
    cta: 'Create account',
    alt: 'Sign in instead',
    altPath: '/login',
  },
}

/** URL that asks Kratos to initialize a fresh browser flow (sets the flow cookie). */
function browserInitUrl(kind: FlowKind): string {
  const returnTo = new URLSearchParams(window.location.search).get('return_to')
  const ret = returnTo ?? window.location.origin + '/'
  return `${config.kratosUrl}/self-service/${kind}/browser?return_to=${encodeURIComponent(ret)}`
}

/**
 * Renders an Ory Kratos browser self-service flow (login / registration).
 *
 * Kratos redirects the browser here as `?flow=<id>` (see kratos.yaml `ui_url`).
 * We fetch the flow JSON, then render its nodes as a NATIVE form that POSTs back
 * to `ui.action` — letting the browser handle the CSRF token + 303 redirect to
 * `return_to` on success, which is the canonical pattern for browser flows.
 * Missing/expired flow → re-initialize via the browser endpoint.
 */
export function KratosFlow({ kind }: { kind: FlowKind }) {
  const [flow, setFlow] = useState<KratosFlow | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const initKey = `kratos:init:${kind}`
    const retryKey = `kratos:retry:${kind}`
    const flowId = new URLSearchParams(window.location.search).get('flow')

    if (!flowId) {
      // No flow yet — bounce to Kratos to create one; it redirects back with ?flow=.
      // Guard against a no-flow loop (e.g. cookies blocked so the flow never sticks).
      if (sessionStorage.getItem(initKey)) {
        sessionStorage.removeItem(initKey)
        setError(COOKIE_HINT)
        return
      }
      sessionStorage.setItem(initKey, '1')
      window.location.href = browserInitUrl(kind)
      return
    }
    // We have a flow id — the init step landed. Clear the init guard.
    sessionStorage.removeItem(initKey)

    let cancelled = false
    fetch(`${config.kratosUrl}/self-service/${kind}/flows?id=${encodeURIComponent(flowId)}`, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
      .then(async (res) => {
        // 404/410/403 → flow gone/expired, or (most often) the CSRF cookie didn't
        // ride along on this cross-site XHR. Re-initialize AT MOST ONCE, then stop
        // and explain — never loop forever swapping flow ids.
        if (res.status === 404 || res.status === 410 || res.status === 403) {
          if (sessionStorage.getItem(retryKey)) {
            sessionStorage.removeItem(retryKey)
            if (!cancelled) setError(COOKIE_HINT)
            return
          }
          sessionStorage.setItem(retryKey, '1')
          window.location.href = browserInitUrl(kind)
          return
        }
        if (!res.ok) throw new Error(`flow ${res.status}`)
        const data = (await res.json()) as KratosFlow
        sessionStorage.removeItem(retryKey)
        if (!cancelled) setFlow(data)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load sign-in form')
      })

    return () => {
      cancelled = true
    }
  }, [kind])

  if (error) {
    return (
      <Centered>
        <h1 className="text-2xl font-semibold">{KIND_LABEL[kind].title}</h1>
        <p className="text-destructive">{error}</p>
        <Button onClick={() => (window.location.href = browserInitUrl(kind))}>Try again</Button>
      </Centered>
    )
  }

  if (!flow) {
    return (
      <Centered>
        <Spinner />
      </Centered>
    )
  }

  const meta = KIND_LABEL[kind]
  // Split nodes: password (email/identifier/password + submit) vs. oidc (social) vs. hidden (csrf).
  const oidcNodes = flow.ui.nodes.filter((n) => n.group === 'oidc')
  const formNodes = flow.ui.nodes.filter((n) => n.group !== 'oidc')

  return (
    <Centered>
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">{meta.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">to AI Agent Workspace</p>
        </div>

        <FlowMessages messages={flow.ui.messages} />

        <form action={flow.ui.action} method={flow.ui.method} className="space-y-4">
          {formNodes.map((node, i) => (
            <NodeField key={node.attributes.name ?? `n${i}`} node={node} kind={kind} />
          ))}
        </form>

        {oidcNodes.length > 0 && (
          <form action={flow.ui.action} method={flow.ui.method} className="space-y-2">
            {/* CSRF token must ride along with the OIDC form too. */}
            {flow.ui.nodes
              .filter((n) => n.attributes.type === 'hidden')
              .map((n, i) => (
                <input
                  key={`h${i}`}
                  type="hidden"
                  name={n.attributes.name}
                  value={String(n.attributes.value ?? '')}
                />
              ))}
            {oidcNodes.map((node, i) => (
              <NodeField key={node.attributes.name ?? `o${i}`} node={node} kind={kind} />
            ))}
          </form>
        )}

        <p className="text-center text-sm text-muted-foreground">
          <a className="underline underline-offset-4 hover:text-foreground" href={meta.altPath}>
            {meta.alt}
          </a>
        </p>
      </div>
    </Centered>
  )
}

function NodeField({ node, kind }: { node: UiNode; kind: FlowKind }) {
  const a = node.attributes
  const name = a.name ?? ''
  const value = a.value == null ? '' : String(a.value)

  if (a.type === 'hidden') {
    return <input type="hidden" name={name} value={value} />
  }

  if (a.type === 'submit' || a.type === 'button') {
    const isOidc = node.group === 'oidc'
    return (
      <Button
        type="submit"
        name={name}
        value={value}
        variant={isOidc ? 'outline' : 'default'}
        className="w-full"
      >
        {node.meta?.label?.text ?? KIND_LABEL[kind].cta}
      </Button>
    )
  }

  const label = a.label?.text ?? node.meta?.label?.text ?? name
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      <Input
        id={name}
        name={name}
        type={a.type ?? 'text'}
        defaultValue={value}
        required={a.required}
        disabled={a.disabled}
        autoComplete={autocompleteFor(name)}
      />
      <NodeMessages messages={node.messages} />
    </div>
  )
}

function autocompleteFor(name: string): string | undefined {
  if (name === 'identifier' || name.includes('email')) return 'username'
  if (name === 'password') return 'current-password'
  return undefined
}

function FlowMessages({ messages }: { messages?: { id: number; text: string; type: string }[] }) {
  if (!messages?.length) return null
  return (
    <div className="space-y-1">
      {messages.map((m) => (
        <p
          key={m.id}
          className={m.type === 'error' ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}
        >
          {m.text}
        </p>
      ))}
    </div>
  )
}

function NodeMessages({ messages }: { messages?: { id: number; text: string; type: string }[] }) {
  if (!messages?.length) return null
  return (
    <>
      {messages.map((m) => (
        <p key={m.id} className="text-xs text-destructive">
          {m.text}
        </p>
      ))}
    </>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex h-dvh flex-col items-center justify-center gap-4 px-4">{children}</div>
}
