import {
  MessageSquare,
  Bot,
  BookOpen,
  Brain,
  ListChecks,
  Settings,
  type LucideIcon,
} from 'lucide-react'

export type View = 'chat' | 'agents' | 'knowledge' | 'memory' | 'tasks' | 'settings'

export const VIEW_PATHS: Record<View, string> = {
  chat: '/',
  agents: '/agents',
  knowledge: '/knowledge',
  memory: '/memory',
  tasks: '/tasks',
  settings: '/settings',
}

export interface NavItem {
  key: View
  label: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { key: 'chat', label: 'Chat', icon: MessageSquare },
  { key: 'agents', label: 'Agents', icon: Bot },
  { key: 'knowledge', label: 'Knowledge', icon: BookOpen },
  { key: 'memory', label: 'Memory', icon: Brain },
  { key: 'tasks', label: 'Tasks', icon: ListChecks },
  { key: 'settings', label: 'Settings', icon: Settings },
]

export const VIEW_TITLES: Record<View, string> = {
  chat: 'Chat',
  agents: 'Agents',
  knowledge: 'Knowledge',
  memory: 'Memory',
  tasks: 'Tasks',
  settings: 'Settings',
}
