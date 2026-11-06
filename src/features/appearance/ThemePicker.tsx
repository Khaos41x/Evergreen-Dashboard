import { useId, useState, useSyncExternalStore } from 'react'
import { Check } from 'lucide-react'
import { currentTheme, selectTheme, subscribeTheme, themes } from './theme'

export function ThemePicker() {
  const current = useSyncExternalStore(subscribeTheme, currentTheme)
  const name = useId()
  const [persisted, setPersisted] = useState(true)

  return (
    <fieldset className="appearance-picker">
      <legend>Aparência</legend>
      <p role="status">{persisted ? 'Seu tema fica salvo neste dispositivo.' : 'Tema aplicado. O navegador bloqueou o salvamento.'}</p>
      <div className="appearance-options">
        {themes.map(theme => (
          <label key={theme.id} className="appearance-option" data-preview={theme.id}>
            <input type="radio" name={name} value={theme.id} checked={current === theme.id}
              onChange={() => setPersisted(selectTheme(theme.id))} />
            <span className="appearance-preview" aria-hidden="true"><i /><i /><i /><i /></span>
            <span className="appearance-label"><strong>{theme.label}</strong><small>{theme.description}</small></span>
            {current === theme.id && <Check className="appearance-check" size={16} aria-hidden="true" />}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
