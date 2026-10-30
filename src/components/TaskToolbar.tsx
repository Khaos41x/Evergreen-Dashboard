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
    <label className="task-search"><Search /><input id="task-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar tarefas..." />{query && <button onClick={() => setQuery('')} aria-label="Limpar busca"><X /></button>}<kbd>/</kbd></label>
    <div className="toolbar-controls">
      <label className={selectClass(project !== 'all')}><span>Projeto</span><select aria-label="Filtrar por projeto" value={project} onChange={event => setProject(event.target.value)}><option value="all">Todos os projetos</option>{projects.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><ChevronDown /></label>
      <label className={selectClass(filters.assignee !== 'all')}><span>Responsável</span><select aria-label="Filtrar por responsável" value={filters.assignee} onChange={event => setFilters({ ...filters, assignee: event.target.value })}><option value="all">Todos os responsáveis</option><option value="unassigned">Sem responsável</option>{people.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><ChevronDown /></label>
      <label className={selectClass(filters.priority !== 'all')}><span>Prioridade</span><select aria-label="Filtrar por prioridade" value={filters.priority} onChange={event => setFilters({ ...filters, priority: event.target.value as Filters['priority'] })}><option value="all">Todas as prioridades</option><option value="low">Baixa</option><option value="normal">Normal</option><option value="high">Alta</option><option value="urgent">Urgente</option></select><ChevronDown /></label>
      <label className={selectClass(filters.due !== 'all')}><span>Prazo</span><select aria-label="Filtrar por prazo" value={filters.due} onChange={event => setFilters({ ...filters, due: event.target.value as Filters['due'] })}><option value="all">Qualquer data</option><option value="today">Hoje</option><option value="week">Esta semana</option><option value="overdue">Em atraso</option><option value="none">Sem prazo</option></select><ChevronDown /></label>
      <label className={selectClass(filters.status !== 'all')}><span>Situação</span><select aria-label="Filtrar por situação" value={filters.status} onChange={event => setFilters({ ...filters, status: event.target.value as Filters['status'] })}><option value="all">Todas as situações</option><option value="backlog">Em espera</option><option value="todo">A fazer</option><option value="in-progress">Em andamento</option><option value="done">Concluído</option></select><ChevronDown /></label>
    </div>
    <label className="sort-control"><ArrowDownUp /><span>Ordenar:</span><select aria-label="Ordenar tarefas" value={sort} onChange={event => setSort(event.target.value)}><option>Prioridade</option><option>Prazo</option><option>Atualização recente</option></select><ChevronDown /></label>
  </div>
}
