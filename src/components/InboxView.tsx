import { ArrowUpRight, Inbox, LockKeyhole } from 'lucide-react'
import type { InboxItem } from '../types'

export function InboxView({ items, onConvert }: { items: InboxItem[]; onConvert: (item: InboxItem) => void }) {
  return (
    <div className="inbox-view">
      <div className="private-note"><span className="private-icon"><LockKeyhole /></span><div><strong>Sua caixa de entrada privada</strong><p>Só você vê estas anotações. Transforme uma delas em tarefa quando estiver pronta para a equipe.</p></div></div>
      <div className="inbox-list">
        <div className="inbox-list-head"><Inbox /><span>REGISTRADO</span><small>{items.length}</small></div>
        {items.map(item => <div className="inbox-row" key={item.id}><span className="inbox-bullet" /><strong>{item.title}</strong><small>{item.created}</small><button onClick={() => onConvert(item)}>Transformar em tarefa <ArrowUpRight /></button></div>)}
        {items.length === 0 && <div className="inbox-empty"><strong>Sua caixa de entrada está vazia.</strong><span>Suas ideias e anotações rápidas aparecerão aqui.</span></div>}
      </div>
    </div>
  )
}
