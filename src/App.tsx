import { useState } from 'react'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { ChatView } from '@/components/chat-view'
import { ModelPicker } from '@/components/model-picker'
import { LoginGate } from '@/components/login-gate'

function Workspace() {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [model, setModel] = useState<string | undefined>(undefined)

  return (
    <SidebarProvider>
      <AppSidebar activeId={activeId} onSelect={setActiveId} />
      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <h1 className="font-medium">AI Agent Workspace</h1>
          <div className="ml-auto">
            <ModelPicker value={model} onChange={setModel} />
          </div>
        </header>
        <main className="h-[calc(100dvh-3.5rem)]">
          {activeId ? (
            <ChatView key={activeId} sessionId={activeId} model={model} />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              Select or start a conversation.
            </div>
          )}
        </main>
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
