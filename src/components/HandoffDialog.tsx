import { ArrowRight, X } from 'lucide-react'
import { AssigneeAvatar } from './ui'
import type { Person } from '../types'

export function HandoffDialog({ open, onClose, onConfirm, currentUser, recipient }: { open: boolean; onClose: () => void; onConfirm: () => void; currentUser: Person; recipient?: Person }) {
  if (!open) return null
  return (
    <div className="overlay high" onMouseDown={onClose}><div className="mini-dialog" onMouseDown={e => e.stopPropagation()}>
      <div className="mini-title"><h3>Hand off task</h3><button onClick={onClose}><X /></button></div>
      <div className="handoff-people"><AssigneeAvatar person={currentUser} size="lg" /><span>{currentUser.name}</span><ArrowRight />{recipient ? <><AssigneeAvatar person={recipient} size="lg" /><span>{recipient.name}</span></> : <span>No teammate available</span>}</div>
      <label>What I did<textarea placeholder="Summarize the work completed…" /></label>
      <label>Current state<textarea placeholder="What should the next owner know?" /></label>
      <label>What remains<textarea placeholder="List the next steps…" /></label>
      <div className="mini-actions"><button onClick={onClose}>Cancel</button><button className="create-button" disabled={!recipient} onClick={onConfirm}>Hand off</button></div>
    </div></div>
  )
}
