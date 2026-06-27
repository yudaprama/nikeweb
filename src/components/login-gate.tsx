import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useSession, loginUrl, registerUrl } from '@/lib/auth'

/** Gates the app behind a Kratos session. No session → sign-in screen. */
export function LoginGate({ children }: { children: ReactNode }) {
  const { data: session, isLoading, isError } = useSession()

  if (isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (isError || !session?.active) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">AI Agent Workspace</h1>
          <p className="mt-2 text-muted-foreground">Sign in to continue.</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => (window.location.href = loginUrl())}>Sign in</Button>
          <Button variant="outline" onClick={() => (window.location.href = registerUrl())}>
            Create account
          </Button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
