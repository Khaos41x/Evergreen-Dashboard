import { Circle, CircleDashed, CircleDotDashed, CheckCircle2, Signal, Target } from 'lucide-react'
import type { Person, Priority, TaskStatus } from '../types'

export function AssigneeAvatar({ person, size = 'md' }: { person: Person; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'h-6 w-6 text-[8px]', md: 'h-7 w-7 text-[9px]', lg: 'h-11 w-11 text-[10px]' }
  return (
    <span className={`avatar avatar-${person.id} avatar-${size} ${sizes[size]}`} style={{ '--avatar': person.tone } as React.CSSProperties} title={person.name}>
      <span className="avatar-fallback">{person.initials}</span>
    </span>
  )
}

export function StatusIcon({ status, className = '' }: { status: TaskStatus; className?: string }) {
  const common = `h-[18px] w-[18px] ${className}`
  if (status === 'done') return <CheckCircle2 className={`${common} text-emerald`} strokeWidth={1.8} />
  if (status === 'in-progress') return <CircleDotDashed className={`${common} text-emerald`} strokeWidth={1.7} />
  if (status === 'todo') return <Circle className={`${common} text-soft`} strokeWidth={1.8} />
  return <CircleDashed className={`${common} text-muted`} strokeWidth={1.6} />
}

export function PriorityIndicator({ priority, showLabel = true }: { priority: Priority; showLabel?: boolean }) {
  const styles: Record<Priority, string> = { low: 'priority-low', normal: 'priority-normal', high: 'priority-high', urgent: 'priority-urgent' }
  return (
    <span className={`priority ${styles[priority]}`} title={priority}>
      <Signal className="h-3.5 w-3.5" strokeWidth={1.8} />
      {showLabel && <span>{priority[0].toUpperCase() + priority.slice(1)}</span>}
    </span>
  )
}

export function ProjectIndicator({ project }: { project: string }) {
  return <span className="project-indicator"><span className="project-dot" />{project || 'No project'}</span>
}

export function ObjectiveIndicator({ label = 'Linked objective' }: { label?: string }) {
  return <span className="objective-indicator" title={label}><Target className="h-3.5 w-3.5" strokeWidth={1.7} /></span>
}
