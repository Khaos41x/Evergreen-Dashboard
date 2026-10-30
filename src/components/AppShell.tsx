import {EvergreenBrand} from './EvergreenBrand'
import { useState, type ReactNode } from 'react'
import { Activity, Bell, CirclePlay, House, Menu, Orbit, Plus, Search, SquareCheckBig, TriangleAlert, UsersRound, X } from 'lucide-react'
import { AssigneeAvatar } from './ui'
import type { Person, Project } from '../types'
import { WorldModeSwitch } from '../features/world/WorldModeSwitch'
import '../features/world/world.css'

type Page = 'home' | 'tasks'

const nav = [
  { id: 'home', label: "Início", icon: House }, { id: 'tasks', label: "Tarefas", icon: SquareCheckBig },
  { id: 'focus', label: "Foco", icon: CirclePlay }, { id: 'objectives', label: "Objetivos", icon: Orbit },
  { id: 'issues', label: "Ocorrências", icon: TriangleAlert }, { id: 'work', label: "Trabalho", icon: Activity },
] as const

function Sidebar({ page, setPage, mobileOpen, close, projects, currentUser, onNewProject, onOpenFocus }: { page: Page; setPage: (page: Page) => void; mobileOpen: boolean; close: () => void; projects: Project[]; currentUser: Person; onNewProject: () => void; onOpenFocus: () => void }) {
  const navigate = (id: typeof nav[number]['id']) => {
    if (id === 'tasks') setPage('tasks')
    else if (id === 'focus') onOpenFocus()
    else {
      setPage('home')
      const selector = id === 'objectives' ? '.objectives-block' : id === 'issues' ? '.today-static-row' : id === 'work' ? '.recent-block' : '.reference-home'
      window.setTimeout(() => document.querySelector(selector)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 0)
    }
    close()
  }
  return (
    <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
      <div className="brand"><EvergreenBrand symbol/><button className="mobile-close" onClick={close}><X /></button></div>
      <nav className="main-nav" aria-label="Navegação principal">
        {nav.map(({ id, label, icon: Icon }) => (
          <button key={id} className={`nav-item ${page === id ? 'active' : ''}`} onClick={() => navigate(id)}>
            <Icon /><span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-rule" />
      <div className="projects-heading"><span>Projetos</span><button aria-label="Novo projeto" onClick={onNewProject}><Plus /></button></div>
      {projects.map(project => <button className="project-link" key={project.id} onClick={() => setPage('tasks')}>{project.name}</button>)}
      <button className="project-link new-project" onClick={onNewProject}><Plus /> <span>Novo projeto</span></button>
      <div className="profile-card">
        <AssigneeAvatar person={currentUser} size="lg" />
        <span className="profile-copy"><strong>{currentUser.name}</strong><small>Perfil</small></span>
      </div>
    </aside>
  )
}

function TopBar({ openPalette, openMenu, currentUser, world, onWorldChange }: { openPalette: () => void; openMenu: () => void; currentUser: Person; world:boolean;onWorldChange:(world:boolean)=>void }) {
  return (
    <header className="topbar">
      <button className="menu-trigger" onClick={openMenu} aria-label="Abrir navegação"><Menu /></button>
      <label className="global-search">
        <Search /><input aria-label="Buscar no espaço" placeholder="Buscar no espaço..." onFocus={openPalette} readOnly /><kbd>Ctrl</kbd><kbd>K</kbd>
      </label>
      <WorldModeSwitch world={world} onChange={onWorldChange}/>
      <div className="top-actions">
        <span className="top-action-icon" aria-label="Equipe"><UsersRound /></span><span className="top-action-icon" aria-label="Atividade"><Activity /></span>
        <span className="top-action-icon notification" aria-label="Notificações"><Bell /></span>
        <AssigneeAvatar person={currentUser} size="lg" />
      </div>
    </header>
  )
}

export function AppShell({ page, setPage, children, onOpenPalette, projects, currentUser, onNewProject, onOpenFocus,world,onWorldChange }: { page: Page; setPage: (page: Page) => void; children: ReactNode; onOpenPalette: () => void; projects: Project[]; currentUser: Person; onNewProject: () => void; onOpenFocus: () => void;world:boolean;onWorldChange:(world:boolean)=>void }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  return (
    <div className="app-shell">
      <Sidebar page={page} setPage={setPage} mobileOpen={mobileOpen} close={() => setMobileOpen(false)} projects={projects} currentUser={currentUser} onNewProject={onNewProject} onOpenFocus={onOpenFocus} />
      {mobileOpen && <button className="sidebar-backdrop" aria-label="Fechar navegação" onClick={() => setMobileOpen(false)} />}
      <div className="workspace"><TopBar openPalette={onOpenPalette} openMenu={() => setMobileOpen(true)} currentUser={currentUser} world={world} onWorldChange={onWorldChange}/>{children}</div>
    </div>
  )
}
