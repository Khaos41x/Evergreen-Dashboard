import { ArrowDownUp, ChevronDown, Search, X } from 'lucide-react'
import type { Person, Priority, Project, TaskStatus } from '../types'

interface Filters {
  assignee: string
  priority: Priority | 'all'
  due: 'all' | 'today' | 'week' | 'overdue' | 'none'
  status: TaskStatus | 'all'
}

export function TaskToolbar({ query, setQuery, project, setProject, sort, setSort, projects, people, filters, setFilters }: { query: string; setQuery: (value: string) => void; project: string; setProject: (value: string) => void; sort: string; setSort: (value: string) => void; projects: Project[]; people: Person[]; filters: Filters; setFilters: (filters: Filters) => void }) {
  const selectClass = (active: boolean) => `filter-select ${active ? 'active' : ''}`
  return <div className="task-toolbar">
    <label className="task-search"><Search /><input id="task-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search tasks..." />{query && <button onClick={() => setQuery('')} aria-label="Clear search"><X /></button>}<kbd>/</kbd></label>
    <div className="toolbar-controls">
      <label className={selectClass(project !== 'all')}><span>Project</span><select value={project} onChange={event => setProject(event.target.value)}><option value="all">All projects</option>{projects.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><ChevronDown /></label>
      <label className={selectClass(filters.assignee !== 'all')}><span>Assignee</span><select value={filters.assignee} onChange={event => setFilters({ ...filters, assignee: event.target.value })}><option value="all">All assignees</option><option value="unassigned">Unassigned</option>{people.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><ChevronDown /></label>
      <label className={selectClass(filters.priority !== 'all')}><span>Priority</span><select value={filters.priority} onChange={event => setFilters({ ...filters, priority: event.target.value as Filters['priority'] })}><option value="all">All priorities</option><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select><ChevronDown /></label>
      <label className={selectClass(filters.due !== 'all')}><span>Due date</span><select value={filters.due} onChange={event => setFilters({ ...filters, due: event.target.value as Filters['due'] })}><option value="all">Any date</option><option value="today">Today</option><option value="week">This week</option><option value="overdue">Overdue</option><option value="none">No date</option></select><ChevronDown /></label>
      <label className={selectClass(filters.status !== 'all')}><span>Status</span><select value={filters.status} onChange={event => setFilters({ ...filters, status: event.target.value as Filters['status'] })}><option value="all">All statuses</option><option value="backlog">Backlog</option><option value="todo">Todo</option><option value="in-progress">In Progress</option><option value="done">Done</option></select><ChevronDown /></label>
    </div>
    <label className="sort-control"><ArrowDownUp /><span>Sort:</span><select value={sort} onChange={event => setSort(event.target.value)}><option>Priority</option><option>Due date</option><option>Recently updated</option></select><ChevronDown /></label>
  </div>
}
