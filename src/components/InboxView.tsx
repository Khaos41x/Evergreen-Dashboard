import { ArrowUpRight, Inbox, LockKeyhole } from 'lucide-react'
import type { InboxItem } from '../types'

export function InboxView({ items, onConvert }: { items: InboxItem[]; onConvert: (item: InboxItem) => void }) {
  return (
    <div className="inbox-view">
      <div className="private-note"><span className="private-icon"><LockKeyhole /></span><div><strong>Your private Inbox</strong><p>Only you can see these notes. Convert one when it is ready for the team.</p></div></div>
      <div className="inbox-list">
        <div className="inbox-list-head"><Inbox /><span>CAPTURED</span><small>{items.length}</small></div>
        {items.map(item => <div className="inbox-row" key={item.id}><span className="inbox-bullet" /><strong>{item.title}</strong><small>{item.created}</small><button onClick={() => onConvert(item)}>Convert to task <ArrowUpRight /></button></div>)}
        {items.length === 0 && <div className="inbox-empty"><strong>Inbox is empty.</strong><span>Quick notes you capture will appear here.</span></div>}
      </div>
    </div>
  )
}
