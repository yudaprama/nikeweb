/** Tailwind dot color for a Hatchet task/run status (V1TaskStatus values). */
export function statusColor(status?: string): string {
  switch (status) {
    case 'FAILED':
      return 'bg-destructive'
    case 'COMPLETED':
      return 'bg-emerald-500'
    case 'RUNNING':
      return 'bg-primary animate-pulse'
    case 'QUEUED':
      return 'bg-amber-500'
    case 'CANCELLED':
      return 'bg-muted-foreground'
    default:
      return 'bg-muted-foreground'
  }
}
