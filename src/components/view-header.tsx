import type { ReactNode } from 'react'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'

interface ViewHeaderProps {
  title: ReactNode
  children?: ReactNode
}

/** Slim top bar shared by the inner views: sidebar toggle + title + right slot. */
export function ViewHeader({ title, children }: ViewHeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 h-4" />
      <div className="min-w-0 flex-1 truncate text-sm font-semibold">{title}</div>
      {children}
    </header>
  )
}
