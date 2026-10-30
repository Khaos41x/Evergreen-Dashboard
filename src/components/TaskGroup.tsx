import { useState } from 'react'
import { ChevronDown, Plus } from 'lucide-react'
import type { Objective, Person, Project, Task } from '../types'
import { TaskRow } from './TaskRow'

const groupStyle = { 'in-progress': 'progress', todo: 'todo', backlog: 'backlog', done: 'done' }

export function TaskGroup({ title, status, tasks, people, projects, objectives, selectedId, onSelect, onToggle, onAdd }: { title: string; status: Task['status']; tasks: Task[]; people: Person[]; projects: Project[]; objectives: Objective[]; selectedId?: string; onSelect: (task: Task) => void; onToggle: (task: Task) => void; onAdd: () => void }) {
  const [open, setOpen] = useState(true)
  return (
    <section className="task-group">
      <div className="group-header">
        <button className="group-toggle" onClick={() => setOpen(!open)} aria-label={`${open ? "Recolher" : "Expandir"} ${title}`}><ChevronDown className={open ? '' : '-rotate-90'} /></button>
        <span className={`group-state ${groupStyle[status]}`} />
        <h2>{title}</h2><span className="group-count">{tasks.length}</span>
        <button className="group-add" onClick={onAdd} aria-label={`Add task to ${title}`}><Plus /></button>
      </div>
      {open && <div className="task-list">{tasks.map(task => <TaskRow key={task.id} task={task} person={people.find(p => p.id === task.assigneeId)} projectName={projects.find(project => project.id === task.projectId)?.name} objectiveTitle={objectives.find(objective => objective.id === task.objectiveId)?.title} selected={selectedId === task.id} onSelect={() => onSelect(task)} onToggle={() => onToggle(task)} />)}</div>}
    </section>
  )
}
