import { useState } from 'react'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { ChatPage } from '@/components/views/chat-page'
import { AgentsView } from '@/components/views/agents-view'
import { KnowledgeView } from '@/components/views/knowledge-view'
import { MemoryView } from '@/components/views/memory-view'
import { TasksView } from '@/components/views/tasks-view'
import { SettingsView } from '@/components/views/settings-view'
import { LoginGate } from '@/components/login-gate'
import { useCreateSession } from '@/lib/sessions'
import type { View } from '@/lib/views'

function Workspace() {
  const [view, setView] = useState<View>('chat')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [model, setModel] = useState<string | undefined>(undefined)
  const createSession = useCreateSession()

  const handleNewConversation = async () => {
    const created = await createSession.mutateAsync('New conversation')
    if (created?.id) {
      setActiveId(created.id)
      setView('chat')
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar
        view={view}
        onView={setView}
        onNewConversation={handleNewConversation}
        creatingConversation={createSession.isPending}
      />
      <SidebarInset className="h-dvh overflow-hidden">
        {view === 'chat' && (
          <ChatPage
            activeId={activeId}
            onSelect={setActiveId}
            model={model}
            onModel={setModel}
          />
        )}
        {view === 'agents' && <AgentsView />}
        {view === 'knowledge' && <KnowledgeView />}
        {view === 'memory' && <MemoryView />}
        {view === 'tasks' && <TasksView />}
        {view === 'settings' && <SettingsView />}
      </SidebarInset>
    </SidebarProvider>
  )
}

export default function App() {
  return (
    <LoginGate>
      <Workspace />
    </LoginGate>
  )
}
