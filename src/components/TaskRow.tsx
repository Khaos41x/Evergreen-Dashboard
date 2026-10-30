import { ListChecks } from 'lucide-react'
import type { Person, Task } from '../types'
import { AssigneeAvatar, ObjectiveIndicator, PriorityIndicator, ProjectIndicator, StatusIcon } from './ui'

export function TaskRow({ task, person, projectName, objectiveTitle, selected, onSelect, onToggle }: { task: Task; person?: Person; projectName?: string; objectiveTitle?: string; selected: boolean; onSelect: () => void; onToggle: () => void }) {
  const complete = task.checklist.filter(item => item.completed).length
  const total = task.checklist.length
  const due = task.dueDate ? new Intl.DateTimeFormat('pt-BR', { month: 'short', day: 'numeric' }).format(new Date(`${task.dueDate}T12:00:00`)) : "Sem prazo"
  return (
    <div className={`task-row ${selected ? 'selected' : ''} ${task.status === 'done' ? 'is-done' : ''}`} onClick={onSelect} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && onSelect()}>
      <button className="status-button" aria-label="Alternar situação da tarefa" onClick={e => { e.stopPropagation(); onToggle() }}><StatusIcon status={task.status} /></button>
      <div className="task-title-cell">
        <span className="task-title">{task.title}</span>
        <div className="task-mobile-meta">{projectName && <ProjectIndicator project={projectName} />}<span>{person?.name ?? "Sem responsável"}</span></div>
      </div>
      <div className="task-project">{projectName ? <ProjectIndicator project={projectName} /> : <span className="text-muted">Sem projeto</span>}</div>
      <div className="task-assignee">{person && <AssigneeAvatar person={person} size="sm" />}<span>{person?.name ?? "Sem responsável"}</span></div>
      <div className="task-priority"><PriorityIndicator priority={task.priority} /></div>
      <div className="task-due">{due}</div>
      <div className="task-signals">
        {total > 0 && <span className="checklist-count"><ListChecks />{complete}/{total}</span>}
        {objectiveTitle && <ObjectiveIndicator label={objectiveTitle} />}
      </div>
    </div>
  )
}
