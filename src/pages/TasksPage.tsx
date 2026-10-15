import { useEffect, useMemo, useState } from 'react'
import { CheckSquare, Plus } from 'lucide-react'
import type { InboxItem, Objective, Person, Priority, Project, TabKey, Task, TaskStatus } from '../types'
import { TaskToolbar } from '../components/TaskToolbar'
import { TaskGroup } from '../components/TaskGroup'
import { InboxView } from '../components/InboxView'
import { NewTaskDialog } from '../components/NewTaskDialog'
import { TaskDrawer } from '../components/TaskDrawer'
import { HandoffDialog } from '../components/HandoffDialog'
import { SuggestTaskDialog } from '../components/SuggestTaskDialog'

const tabs: { id: TabKey; label: string }[] = [{ id: 'my-tasks', label: 'My tasks' }, { id: 'team', label: 'Team' }, { id: 'inbox', label: 'Inbox' }, { id: 'completed', label: 'Completed' }]
const rank = { urgent: 0, high: 1, normal: 2, low: 3 }

export function TasksPage({ requestCreate, consumeCreate, openInboxSignal, tasks, inbox, setInbox, people, projects, objectives, currentUser, onCreateTask, onUpdateTask, onDeleteTask, onCompleteTask, onCreateProject, onCreateObjective, onStartFocus }: {
  requestCreate: number
  consumeCreate: () => void
  openInboxSignal: number
  tasks: Task[]
  inbox: InboxItem[]
  setInbox: (updater: InboxItem[] | ((items: InboxItem[]) => InboxItem[])) => void
  people: Person[]
  projects: Project[]
  objectives: Objective[]
  currentUser: Person
  onCreateTask: (task: Task) => void
  onUpdateTask: (task: Task) => void
  onDeleteTask: (taskId: string) => void
  onCompleteTask: (taskId: string, complete?: boolean) => void
  onCreateProject: () => void
  onCreateObjective: () => void
  onStartFocus: (taskId?: string) => void
}) {
  const [tab, setTab] = useState<TabKey>('my-tasks')
  const [query, setQuery] = useState('')
  const [project, setProject] = useState('all')
  const [sort, setSort] = useState('Priority')
  const [filters, setFilters] = useState<{ assignee: string; priority: Priority | 'all'; due: 'all' | 'today' | 'week' | 'overdue' | 'none'; status: TaskStatus | 'all' }>({ assignee: 'all', priority: 'all', due: 'all', status: 'all' })
  const [selected, setSelected] = useState<Task | null>(null)
  const [newOpen, setNewOpen] = useState(false)
  const [newStatus, setNewStatus] = useState<TaskStatus>('todo')
  const [prefill, setPrefill] = useState('')
  const [handoff, setHandoff] = useState(false)
  const [suggest, setSuggest] = useState(false)

  useEffect(() => { if (requestCreate) { setNewStatus('todo'); setPrefill(''); setNewOpen(true); consumeCreate() } }, [requestCreate, consumeCreate])
  useEffect(() => { if (openInboxSignal) setTab('inbox') }, [openInboxSignal])
  useEffect(() => { if (selected) setSelected(tasks.find(task => task.id === selected.id) ?? null) }, [tasks])
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) return
      if (event.key === '/') { event.preventDefault(); document.querySelector<HTMLInputElement>('#task-search')?.focus() }
      if (event.key.toLowerCase() === 'f' && selected) onStartFocus(selected.id)
      if (event.key === 'Escape') { setSelected(null); setNewOpen(false); setHandoff(false); setSuggest(false) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selected, onStartFocus])

  const visible = useMemo(() => {
    let rows = tasks.filter(task => tab === 'completed' ? task.status === 'done' : task.status !== 'done')
    if (tab === 'my-tasks') rows = rows.filter(task => task.assigneeId === currentUser.id)
    if (query) rows = rows.filter(task => task.title.toLowerCase().includes(query.toLowerCase()))
    if (project !== 'all') rows = rows.filter(task => task.projectId === project)
    if (filters.assignee !== 'all') rows = rows.filter(task => filters.assignee === 'unassigned' ? !task.assigneeId : task.assigneeId === filters.assignee)
    if (filters.priority !== 'all') rows = rows.filter(task => task.priority === filters.priority)
    if (filters.status !== 'all') rows = rows.filter(task => task.status === filters.status)
    if (filters.due !== 'all') {
      const today = new Date().toISOString().slice(0, 10)
      const week = new Date(); week.setDate(week.getDate() + 7); const weekDate = week.toISOString().slice(0, 10)
      rows = rows.filter(task => filters.due === 'none' ? !task.dueDate : filters.due === 'today' ? task.dueDate === today : filters.due === 'week' ? Boolean(task.dueDate && task.dueDate >= today && task.dueDate <= weekDate) : Boolean(task.dueDate && task.dueDate < today))
    }
    if (sort === 'Priority') rows.sort((a, b) => rank[a.priority] - rank[b.priority])
    if (sort === 'Due date') rows.sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'))
    if (sort === 'Recently updated') rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return rows
  }, [tasks, tab, query, project, sort, filters, currentUser.id])

  const addFor = (status: TaskStatus) => { setNewStatus(status); setPrefill(''); setNewOpen(true) }
  const updateTask = (next: Task) => { onUpdateTask(next); setSelected(next) }
  const toggleTask = (task: Task) => onCompleteTask(task.id, task.status !== 'done')
  const convertInbox = (item: InboxItem) => { setPrefill(item.title); setNewStatus('todo'); setNewOpen(true); setInbox(rows => rows.filter(row => row.id !== item.id)) }
  const groups = tab === 'completed' ? [{ title: 'COMPLETED', status: 'done' as const }] : [{ title: 'IN PROGRESS', status: 'in-progress' as const }, { title: 'TODO', status: 'todo' as const }, { title: 'BACKLOG', status: 'backlog' as const }]
  const handoffRecipient = people.find(person => person.id !== currentUser.id)

  return <main className="tasks-page">
    <div className="tasks-header"><div><h1>Tasks</h1><p>Plan, assign and finish what matters.</p></div><button className="new-task-button" onClick={() => addFor('todo')}><Plus /> New task</button></div>
    <div className="tasks-tabs" role="tablist">{tabs.map(item => <button role="tab" aria-selected={tab === item.id} key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}>{item.label}{item.id === 'inbox' && inbox.length > 0 && <span>{inbox.length}</span>}</button>)}</div>
    {tab === 'inbox' ? <InboxView items={inbox} onConvert={convertInbox} /> : <>
      <TaskToolbar query={query} setQuery={setQuery} project={project} setProject={setProject} sort={sort} setSort={setSort} projects={projects} people={people} filters={filters} setFilters={setFilters} />
      <div className="task-columns"><span>Task</span><span>Project</span><span>Assignee</span><span>Priority</span><span>Due</span><span /></div>
      <div className="task-groups">{groups.map(group => <TaskGroup key={group.status} title={group.title} status={group.status} tasks={visible.filter(task => task.status === group.status)} people={people} projects={projects} objectives={objectives} selectedId={selected?.id} onSelect={setSelected} onToggle={toggleTask} onAdd={() => addFor(group.status)} />)}{visible.length === 0 && <div className="empty-tasks"><CheckSquare /><strong>No tasks here</strong><span>Try another filter or create a task.</span></div>}</div>
    </>}
    <NewTaskDialog open={newOpen} onClose={() => setNewOpen(false)} defaultStatus={newStatus} initialTitle={prefill} people={people} projects={projects} objectives={objectives} onCreateProject={onCreateProject} onCreateObjective={onCreateObjective} onCreate={onCreateTask} />
    <TaskDrawer task={selected} people={people} projects={projects} objectives={objectives} onClose={() => setSelected(null)} onUpdate={updateTask} onDelete={onDeleteTask} onHandoff={() => setHandoff(true)} onSuggest={() => setSuggest(true)} onFocus={() => onStartFocus(selected?.id)} />
    <HandoffDialog open={handoff} currentUser={currentUser} recipient={handoffRecipient} onClose={() => setHandoff(false)} onConfirm={() => { if (selected && handoffRecipient) updateTask({ ...selected, assigneeId: handoffRecipient.id, activity: [{ id: `activity-${crypto.randomUUID()}`, body: `${currentUser.name} handed this task off to ${handoffRecipient.name}`, time: 'Just now' }, ...(selected.activity ?? [])] }); setHandoff(false) }} />
    <SuggestTaskDialog open={suggest} onClose={() => setSuggest(false)} onConfirm={() => { if (selected) updateTask({ ...selected, activity: [{ id: `activity-${crypto.randomUUID()}`, body: 'A follow-up was suggested', time: 'Just now' }, ...(selected.activity ?? [])] }); setSuggest(false) }} />
  </main>
}
