import { X } from 'lucide-react'

export function SuggestTaskDialog({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: () => void }) {
  if (!open) return null
  return <div className="overlay high" onMouseDown={onClose}><div className="mini-dialog suggest-dialog" onMouseDown={e => e.stopPropagation()}>
    <div className="mini-title"><h3>Sugerir próxima tarefa</h3><button onClick={onClose}><X /></button></div>
    <label>Sugestão<input autoFocus placeholder="Descreva a próxima tarefa sugerida" /></label>
    <label>Relacionado a<input placeholder="Tarefa ou contexto" /></label>
    <p>O destinatário pode aceitar, editar ou recusar esta sugestão.</p>
    <div className="mini-actions"><button onClick={onClose}>Cancelar</button><button className="create-button" onClick={onConfirm}>Enviar sugestão</button></div>
  </div></div>
}
