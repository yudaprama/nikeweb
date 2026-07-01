import { createContext, useContext, useState } from 'react'
import {
  Outlet,
  createRouter,
  createRoute,
  createRootRoute,
  redirect,
  useNavigate,
  useParams,
} from '@tanstack/react-router'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { LoginGate } from '@/components/login-gate'
import { KratosFlow } from '@/components/kratos-flow'
import { ChatPage } from '@/components/views/chat-page'
import { AgentsView } from '@/components/views/agents-view'
import { KnowledgeView } from '@/components/views/knowledge-view'
import { MemoryView } from '@/components/views/memory-view'
import { TasksView } from '@/components/views/tasks-view'
import {
  SettingsView,
  UsageTab,
  KeysTab,
  WorkspacesTab,
  AccountTab,
} from '@/components/views/settings-view'
import { useCreateSession } from '@/lib/sessions'
import { useEnsureApiKey } from '@/lib/keys'

interface WorkspaceContextValue {
  model: string | undefined
  setModel: (model: string | undefined) => void
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider')
  return ctx
}

const rootRoute = createRootRoute({
  component: () => <Outlet />,
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: () => <KratosFlow kind="login" />,
})

const registrationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/registration',
  component: () => <KratosFlow kind="registration" />,
})

const appLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'app',
  component: AppLayout,
})

/** Mints a first-run API key for fresh accounts; renders nothing. */
function EnsureApiKey() {
  useEnsureApiKey()
  return null
}

function AppLayout() {
  const navigate = useNavigate()
  const [model, setModel] = useState<string | undefined>(undefined)
  const createSession = useCreateSession()

  const handleNewConversation = async () => {
    const created = await createSession.mutateAsync('New conversation')
    if (created?.id) {
      navigate({ to: '/chat/$sessionId', params: { sessionId: created.id } })
    }
  }

  return (
    <LoginGate>
      {/* Inside the gate → only runs once a Kratos session exists, so the
          self-service key query is never fired anonymously. */}
      <EnsureApiKey />
      <WorkspaceContext.Provider value={{ model, setModel }}>
        <SidebarProvider>
          <AppSidebar
            onNewConversation={handleNewConversation}
            creatingConversation={createSession.isPending}
          />
          <SidebarInset className="h-dvh overflow-hidden">
            <Outlet />
          </SidebarInset>
        </SidebarProvider>
      </WorkspaceContext.Provider>
    </LoginGate>
  )
}

function ChatViewWrapper({ sessionId }: { sessionId: string | null }) {
  const navigate = useNavigate()
  const { model, setModel } = useWorkspace()
  return (
    <ChatPage
      activeId={sessionId}
      onSelect={(id) => navigate({ to: '/chat/$sessionId', params: { sessionId: id } })}
      model={model}
      onModel={setModel}
    />
  )
}

const chatIndexRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/',
  component: () => <ChatViewWrapper sessionId={null} />,
})

const chatSessionRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/chat/$sessionId',
  component: function ChatSessionView() {
    const { sessionId } = useParams({ from: chatSessionRoute.id })
    return <ChatViewWrapper sessionId={sessionId} />
  },
})

const agentsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/agents',
  component: AgentsView,
})

const knowledgeRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/knowledge',
  component: KnowledgeView,
})

const memoryRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/memory',
  component: MemoryView,
})

const tasksRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/tasks',
  component: TasksView,
})

const settingsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/settings',
  component: SettingsView,
})

// Landing on /settings goes to the first tab.
const settingsIndexRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/settings/usage' })
  },
})

const settingsUsageRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/usage',
  component: UsageTab,
})

const settingsKeysRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/keys',
  component: KeysTab,
})

const settingsWorkspacesRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/workspaces',
  component: WorkspacesTab,
})

const settingsAccountRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/account',
  component: AccountTab,
})

const catchAllRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '$',
  beforeLoad: () => {
    throw redirect({ to: '/' })
  },
})

const routeTree = rootRoute.addChildren([
  loginRoute,
  registrationRoute,
  appLayoutRoute.addChildren([
    chatIndexRoute,
    chatSessionRoute,
    agentsRoute,
    knowledgeRoute,
    memoryRoute,
    tasksRoute,
    settingsRoute.addChildren([
      settingsIndexRoute,
      settingsUsageRoute,
      settingsKeysRoute,
      settingsWorkspacesRoute,
      settingsAccountRoute,
    ]),
  ]),
  catchAllRoute,
])

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
