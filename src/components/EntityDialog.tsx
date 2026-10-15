import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

export function EntityDialog({ open, title, placeholder, actionLabel, onClose, onCreate }: {
  open: boolean
  title: string
  placeholder: string
  actionLabel: string
  onClose: () => void
  onCreate: (name: string) => void
}) {
  const [name, setName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setName('')
    window.setTimeout(() => inputRef.current?.focus(), 30)
  }, [open])

  if (!open) return null
  const submit = () => {
    const value = name.trim()
    if (!value) return
    onCreate(value)
    onClose()
  }

  return <div className="overlay" onMouseDown={onClose}>
    <div className="mini-dialog entity-dialog" onMouseDown={event => event.stopPropagation()}>
      <div className="mini-title"><h3>{title}</h3><button onClick={onClose} aria-label="Close"><X /></button></div>
      <label>Name<input ref={inputRef} value={name} placeholder={placeholder} onChange={event => setName(event.target.value)} onKeyDown={event => event.key === 'Enter' && submit()} /></label>
      <div className="mini-actions"><button onClick={onClose}>Cancel</button><button className="create-button" disabled={!name.trim()} onClick={submit}>{actionLabel}</button></div>
    </div>
  </div>
}
