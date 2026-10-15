import { useState } from 'react'
import { CheckSquare, CirclePlay, Inbox, Orbit, Search, X } from 'lucide-react'

export function CommandPalette({ open, onClose, onCreate, onSearchTasks, onInbox, onStartFocus, onCreateObjective }: { open: boolean; onClose: () => void; onCreate: () => void; onSearchTasks: () => void; onInbox: () => void; onStartFocus: () => void; onCreateObjective: () => void }) {
  const [query, setQuery] = useState('')
  if (!open) return null
  const actions = [
    { label: 'Create task', hint: 'C', icon: CheckSquare, action: onCreate },
    { label: 'Search tasks', hint: '/', icon: Search, action: onSearchTasks },
    { label: 'Start focus', hint: 'F', icon: CirclePlay, action: onStartFocus },
    { label: 'Open Inbox', hint: '', icon: Inbox, action: onInbox },
    { label: 'Create objective', hint: '', icon: Orbit, action: onCreateObjective },
  ].filter(action => action.label.toLowerCase().includes(query.toLowerCase()))
  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="command-palette" onMouseDown={e => e.stopPropagation()}>
        <div className="command-input"><Search /><input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Type a command or search…" /><button onClick={onClose}><X /></button></div>
        <p className="command-label">Suggested</p>
        {actions.map(({ label, hint, icon: Icon, action }, i) => <button key={label} className={`command-item ${i === 0 ? 'selected' : ''}`} onClick={action}><Icon /><span>{label}</span>{hint && <kbd>{hint}</kbd>}</button>)}
        {actions.length === 0 && <p className="command-empty">No matching actions.</p>}
      </div>
    </div>
  )
}
