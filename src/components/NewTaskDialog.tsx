import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { CalendarDays, Check, CheckSquare, ChevronDown, CircleDotDashed, Flag, FolderKanban, ListPlus, Orbit, Plus, Trash2, UserRound, X } from 'lucide-react'
import type { ChecklistItem, Objective, Person, Priority, Project, Task, TaskStatus } from '../types'

type MenuName = 'status' | 'assignee' | 'project' | 'priority' | 'due' | 'objective' | null
type Option = { id: string; label: string }

function SelectMenu({ options, onSelect, onClose, footer }: { options: Option[]; onSelect: (id: string) => void; onClose: () => void; footer?: ReactNode }) {
  const menuRef = useRef<HTMLDivElement>(null)
  useEffect(() => { menuRef.current?.querySelector<HTMLButtonElement>('button')?.focus() }, [])
  const move = (direction: number) => {
    const buttons = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])]
    const index = Math.max(0, buttons.indexOf(document.activeElement as HTMLButtonElement))
    buttons[(index + direction + buttons.length) % buttons.length]?.focus()
  }
  return <div className="task-property-menu" ref={menuRef} role="menu" onKeyDown={event => {
    if (event.key === 'ArrowDown') { event.preventDefault(); move(1) }
    if (event.key === 'ArrowUp') { event.preventDefault(); move(-1) }
    if (event.key === 'Escape') { event.stopPropagation(); onClose() }
  }}>
    {options.map(option => <button role="menuitem" key={option.id} onClick={() => onSelect(option.id)}>{option.label}</button>)}
    {footer}
  </div>
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function dueLabel(value: string) {
  if (!value) return 'Due date'
  const today = toIsoDate(new Date())
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
  if (value === today) return 'Today'
  if (value === toIsoDate(tomorrow)) return 'Tomorrow'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(`${value}T12:00:00`))
}

export function NewTaskDialog({ open, onClose, onCreate, people, projects, objectives, onCreateProject, onCreateObjective, defaultStatus = 'todo', initialTitle = '' }: {
  open: boolean
  onClose: () => void
  onCreate: (task: Task) => void
  people: Person[]
  projects: Project[]
  objectives: Objective[]
  onCreateProject: () => void
  onCreateObjective: () => void
  defaultStatus?: TaskStatus
  initialTitle?: string
}) {
  const [title, setTitle] = useState(initialTitle)
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TaskStatus>(defaultStatus)
  const [priority, setPriority] = useState<Priority>('normal')
  const [assigneeId, setAssigneeId] = useState(people[0]?.id ?? '')
  const [projectId, setProjectId] = useState('')
  const [objectiveId, setObjectiveId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [checklistOpen, setChecklistOpen] = useState(false)
  const [newItem, setNewItem] = useState('')
  const [menu, setMenu] = useState<MenuName>(null)
  const [pickDate, setPickDate] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setTitle(initialTitle); setDescription(''); setStatus(defaultStatus); setPriority('normal'); setAssigneeId(people[0]?.id ?? ''); setProjectId(''); setObjectiveId(''); setDueDate(''); setChecklist([]); setChecklistOpen(false); setNewItem(''); setMenu(null); setPickDate(false)
  }
  useEffect(() => { if (open) { reset(); window.setTimeout(() => titleRef.current?.focus(), 30) } }, [open, initialTitle, defaultStatus])
  useEffect(() => {
    if (!open) return
    const handler = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (menu || pickDate) { setMenu(null); setPickDate(false) } else onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, menu, pickDate, onClose])

  const dirty = Boolean(title.trim() || description.trim() || checklist.length)
  const selectedPerson = people.find(person => person.id === assigneeId)
  const selectedProject = projects.find(project => project.id === projectId)
  const selectedObjective = objectives.find(objective => objective.id === objectiveId)
  const statusLabel = useMemo(() => ({ backlog: 'Backlog', todo: 'Todo', 'in-progress': 'In Progress', done: 'Done' })[status], [status])

  if (!open) return null
  const create = () => {
    if (!title.trim()) { titleRef.current?.focus(); return }
    onCreate({ id: `task-${crypto.randomUUID()}`, title: title.trim(), description: description.trim(), status, priority, assigneeId: assigneeId || undefined, projectId: projectId || undefined, objectiveId: objectiveId || undefined, dueDate: dueDate || undefined, checklist, createdAt: new Date().toISOString(), completedAt: status === 'done' ? new Date().toISOString() : undefined })
    reset(); onClose()
  }
  const addChecklist = () => {
    const text = newItem.trim()
    if (!text) return
    setChecklist(items => [...items, { id: `check-${crypto.randomUUID()}`, text, completed: false }]); setNewItem('')
  }
  const chooseDue = (choice: string) => {
    const date = new Date()
    if (choice === 'today') setDueDate(toIsoDate(date))
    if (choice === 'tomorrow') { date.setDate(date.getDate() + 1); setDueDate(toIsoDate(date)) }
    if (choice === 'week') { const days = (7 - date.getDay()) % 7 || 7; date.setDate(date.getDate() + days); setDueDate(toIsoDate(date)) }
    if (choice === 'pick') setPickDate(true)
    setMenu(null)
  }
  const menuFor = (name: MenuName, options: Option[], onSelect: (id: string) => void, footer?: ReactNode) => menu === name && <SelectMenu options={options} onSelect={id => { onSelect(id); setMenu(null) }} onClose={() => setMenu(null)} footer={footer} />

  return <div className="overlay" onMouseDown={() => { if (!dirty) onClose() }}>
    <div className="new-task-dialog" onMouseDown={event => { event.stopPropagation(); if (!(event.target as HTMLElement).closest('.property-picker')) setMenu(null) }}>
      <div className="dialog-top"><span className="dialog-context"><CheckSquare /> New task</span><button onClick={onClose} aria-label="Close new task"><X /></button></div>
      <input ref={titleRef} className="new-title" placeholder="Task title" value={title} onChange={event => setTitle(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) create() }} />
      <textarea className="new-description" placeholder="Add a description…" value={description} onChange={event => setDescription(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && event.ctrlKey) create() }} />
      <div className="dialog-properties">
        <div className="property-picker"><button onClick={() => setMenu(menu === 'status' ? null : 'status')} aria-expanded={menu === 'status'}><CircleDotDashed /><span>{statusLabel}</span><ChevronDown /></button>{menuFor('status', [{ id: 'backlog', label: 'Backlog' }, { id: 'todo', label: 'Todo' }, { id: 'in-progress', label: 'In Progress' }, { id: 'done', label: 'Done' }], id => setStatus(id as TaskStatus))}</div>
        <div className="property-picker"><button onClick={() => setMenu(menu === 'assignee' ? null : 'assignee')} aria-expanded={menu === 'assignee'}><UserRound /><span>{selectedPerson?.name ?? 'Unassigned'}</span><ChevronDown /></button>{menuFor('assignee', [{ id: '', label: 'Unassigned' }, ...people.map(person => ({ id: person.id, label: person.name }))], setAssigneeId)}</div>
        <div className="property-picker"><button onClick={() => setMenu(menu === 'project' ? null : 'project')} aria-expanded={menu === 'project'}><FolderKanban /><span>{selectedProject?.name ?? 'No project'}</span><ChevronDown /></button>{menuFor('project', [{ id: '', label: 'No project' }, ...projects.map(project => ({ id: project.id, label: project.name }))], setProjectId, <button onClick={() => { setMenu(null); onCreateProject() }}><Plus /> Create project</button>)}</div>
        <div className="property-picker"><button onClick={() => setMenu(menu === 'priority' ? null : 'priority')} aria-expanded={menu === 'priority'}><Flag /><span>{priority[0].toUpperCase() + priority.slice(1)}</span><ChevronDown /></button>{menuFor('priority', ['low', 'normal', 'high', 'urgent'].map(id => ({ id, label: id[0].toUpperCase() + id.slice(1) })), id => setPriority(id as Priority))}</div>
        <div className="property-picker"><button onClick={() => setMenu(menu === 'due' ? null : 'due')} aria-expanded={menu === 'due'}><CalendarDays /><span>{dueLabel(dueDate)}</span><ChevronDown /></button>{menuFor('due', [{ id: 'today', label: 'Today' }, { id: 'tomorrow', label: 'Tomorrow' }, { id: 'week', label: 'This week' }, { id: 'pick', label: 'Pick date' }], chooseDue)}{pickDate && <input className="dialog-date-input" type="date" autoFocus value={dueDate} onChange={event => { setDueDate(event.target.value); setPickDate(false) }} />}</div>
        <div className="property-picker"><button onClick={() => setMenu(menu === 'objective' ? null : 'objective')} aria-expanded={menu === 'objective'}><Orbit /><span>{selectedObjective?.title ?? 'No objective'}</span><ChevronDown /></button>{menuFor('objective', [{ id: '', label: 'No objective' }, ...objectives.map(objective => ({ id: objective.id, label: objective.title }))], setObjectiveId, <button onClick={() => { setMenu(null); onCreateObjective() }}><Plus /> Create objective</button>)}</div>
      </div>
      {!checklistOpen ? <button className="add-checklist" onClick={() => setChecklistOpen(true)}><ListPlus /> Add checklist</button> : <section className="dialog-checklist"><h4>Checklist</h4>{checklist.map(item => <div className="dialog-check-row" key={item.id}><button aria-label={item.completed ? 'Mark incomplete' : 'Mark complete'} onClick={() => setChecklist(items => items.map(entry => entry.id === item.id ? { ...entry, completed: !entry.completed } : entry))}>{item.completed ? <Check /> : <span />}</button><input value={item.text} onChange={event => setChecklist(items => items.map(entry => entry.id === item.id ? { ...entry, text: event.target.value } : entry))} /><button aria-label="Remove checklist item" onClick={() => setChecklist(items => items.filter(entry => entry.id !== item.id))}><Trash2 /></button></div>)}<div className="dialog-check-row new-check-row"><span /><input placeholder="Add item…" value={newItem} onChange={event => setNewItem(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addChecklist() } }} /><button onClick={addChecklist} aria-label="Add checklist item"><Plus /></button></div></section>}
      <div className="dialog-footer"><span><kbd>Enter</kbd> to create · <kbd>Ctrl + Enter</kbd> in description</span><button className="create-button" onClick={create} disabled={!title.trim()}>Create task</button></div>
    </div>
  </div>
}
