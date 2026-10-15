import { X } from 'lucide-react'

export function SuggestTaskDialog({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: () => void }) {
  if (!open) return null
  return <div className="overlay high" onMouseDown={onClose}><div className="mini-dialog suggest-dialog" onMouseDown={e => e.stopPropagation()}>
    <div className="mini-title"><h3>Suggest follow-up</h3><button onClick={onClose}><X /></button></div>
    <label>Suggestion<input autoFocus placeholder="Describe the suggested follow-up" /></label>
    <label>Related to<input placeholder="Task or context" /></label>
    <p>The assignee can accept, edit, or dismiss this suggestion.</p>
    <div className="mini-actions"><button onClick={onClose}>Cancel</button><button className="create-button" onClick={onConfirm}>Send suggestion</button></div>
  </div></div>
}
