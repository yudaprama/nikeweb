import { createContext, useContext, useState } from 'react'
import {
  Outlet,
  createRouter,
  createRoute,
  createRootRoute,
  redirect,
  useNavigate,
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
} from '@/components/views/settings-view'
import { useCreateSession } from '@/lib/sessions'
import { useEnsureApiKey } from '@/lib/keys'

interface WorkspaceContextValue {
  activeId: string | null
  setActiveId: (id: string | null) => void
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
  const [activeId, setActiveId] = useState<string | null>(null)
  const [model, setModel] = useState<string | undefined>(undefined)
  const createSession = useCreateSession()

  const handleNewConversation = async () => {
    const created = await createSession.mutateAsync('New conversation')
    if (created?.id) {
      setActiveId(created.id)
      navigate({ to: '/' })
    }
  }

  return (
    <LoginGate>
      {/* Inside the gate → only runs once a Kratos session exists, so the
          self-service key query is never fired anonymously. */}
      <EnsureApiKey />
      <WorkspaceContext.Provider value={{ activeId, setActiveId, model, setModel }}>
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

function ChatView() {
  const { activeId, setActiveId, model, setModel } = useWorkspace()
  return (
    <ChatPage
      activeId={activeId}
      onSelect={setActiveId}
      model={model}
      onModel={setModel}
    />
  )
}

const chatRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/',
  component: ChatView,
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
    chatRoute,
    agentsRoute,
    knowledgeRoute,
    memoryRoute,
    tasksRoute,
    settingsRoute.addChildren([
      settingsIndexRoute,
      settingsUsageRoute,
      settingsKeysRoute,
      settingsWorkspacesRoute,
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
