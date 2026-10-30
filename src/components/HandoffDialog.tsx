import { ArrowRight, X } from 'lucide-react'
import { AssigneeAvatar } from './ui'
import type { Person } from '../types'

export function HandoffDialog({ open, onClose, onConfirm, currentUser, recipient }: { open: boolean; onClose: () => void; onConfirm: () => void; currentUser: Person; recipient?: Person }) {
  if (!open) return null
  return (
    <div className="overlay high" onMouseDown={onClose}><div className="mini-dialog" onMouseDown={e => e.stopPropagation()}>
      <div className="mini-title"><h3>Transferir tarefa</h3><button onClick={onClose}><X /></button></div>
      <div className="handoff-people"><AssigneeAvatar person={currentUser} size="lg" /><span>{currentUser.name}</span><ArrowRight />{recipient ? <><AssigneeAvatar person={recipient} size="lg" /><span>{recipient.name}</span></> : <span>Nenhum colega disponível</span>}</div>
      <label>O que fiz<textarea placeholder="Resuma o trabalho concluído…" /></label>
      <label>Estado atual<textarea placeholder="O que o próximo responsável precisa saber?" /></label>
      <label>O que falta<textarea placeholder="Liste os próximos passos…" /></label>
      <div className="mini-actions"><button onClick={onClose}>Cancelar</button><button className="create-button" disabled={!recipient} onClick={onConfirm}>Transferir</button></div>
    </div></div>
  )
}
