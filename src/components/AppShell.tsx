import { useState, type ReactNode } from 'react'
import { Activity, Bell, CirclePlay, House, Menu, Orbit, Plus, Search, SquareCheckBig, TriangleAlert, UsersRound, X } from 'lucide-react'
import { AssigneeAvatar } from './ui'
import type { Person, Project } from '../types'
import { WorldModeSwitch } from '../features/world/WorldModeSwitch'
import '../features/world/world.css'

type Page = 'home' | 'tasks'

function EvergreenMark() {
  return (
    <svg viewBox="0 0 36 56" className="h-11 w-8 text-emerald" fill="none" aria-hidden="true">
      <path d="M18 3v50M18 5 5 20m13-8 13 14M18 17 3 34m15-10 16 17M18 30 5 46m13-9 12 13" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const nav = [
  { id: 'home', label: 'Home', icon: House }, { id: 'tasks', label: 'Tasks', icon: SquareCheckBig },
  { id: 'focus', label: 'Focus', icon: CirclePlay }, { id: 'objectives', label: 'Objectives', icon: Orbit },
  { id: 'issues', label: 'Issues', icon: TriangleAlert }, { id: 'work', label: 'Work', icon: Activity },
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
      <div className="brand"><EvergreenMark /><span>Evergreen</span><button className="mobile-close" onClick={close}><X /></button></div>
      <nav className="main-nav" aria-label="Primary navigation">
        {nav.map(({ id, label, icon: Icon }) => (
          <button key={id} className={`nav-item ${page === id ? 'active' : ''}`} onClick={() => navigate(id)}>
            <Icon /><span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-rule" />
      <div className="projects-heading"><span>Projects</span><button aria-label="New project" onClick={onNewProject}><Plus /></button></div>
      {projects.map(project => <button className="project-link" key={project.id} onClick={() => setPage('tasks')}>{project.name}</button>)}
      <button className="project-link new-project" onClick={onNewProject}><Plus /> <span>New project</span></button>
      <div className="profile-card">
        <AssigneeAvatar person={currentUser} size="lg" />
        <span className="profile-copy"><strong>{currentUser.name}</strong><small>Profile</small></span>
      </div>
    </aside>
  )
}

function TopBar({ openPalette, openMenu, currentUser, world, onWorldChange }: { openPalette: () => void; openMenu: () => void; currentUser: Person; world:boolean;onWorldChange:(world:boolean)=>void }) {
  return (
    <header className="topbar">
      <button className="menu-trigger" onClick={openMenu} aria-label="Open navigation"><Menu /></button>
      <label className="global-search">
        <Search /><input aria-label="Search anything" placeholder="Search anything..." onFocus={openPalette} readOnly /><kbd>Ctrl</kbd><kbd>K</kbd>
      </label>
      <WorldModeSwitch world={world} onChange={onWorldChange}/>
      <div className="top-actions">
        <span className="top-action-icon" aria-label="Team"><UsersRound /></span><span className="top-action-icon" aria-label="Activity"><Activity /></span>
        <span className="top-action-icon notification" aria-label="Notifications"><Bell /><i /></span>
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
      {mobileOpen && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
      <div className="workspace"><TopBar openPalette={onOpenPalette} openMenu={() => setMobileOpen(true)} currentUser={currentUser} world={world} onWorldChange={onWorldChange}/>{children}</div>
    </div>
  )
}
