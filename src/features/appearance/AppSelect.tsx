import { Children, Fragment, isValidElement, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { ComponentPropsWithoutRef, OptionHTMLAttributes, ReactNode } from 'react'
import * as Select from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import { subscribeTheme } from './theme'

type SelectProps = ComponentPropsWithoutRef<'select'>

function optionText(children: ReactNode): string {
  return Children.toArray(children).map(child =>
    isValidElement<{ children?: ReactNode }>(child) ? optionText(child.props.children) : String(child)
  ).join('')
}

function selectOptions(children: ReactNode): OptionHTMLAttributes<HTMLOptionElement>[] {
  return Children.toArray(children).flatMap(child => {
    if (!isValidElement<OptionHTMLAttributes<HTMLOptionElement>>(child)) return []
    if (child.type === Fragment) return selectOptions(child.props.children)
    return child.type === 'option' ? [child.props] : []
  })
}

function atlasIsActive() {
  return document.documentElement.dataset.theme === 'atlas'
}

export function AppSelect(props: SelectProps) {
  const atlas = useSyncExternalStore(subscribeTheme, atlasIsActive)
  // Keep the native form control mounted through theme changes to preserve drafts and resets.
  return <ThemedSelect atlas={atlas} {...props} />
}

function ThemedSelect({
  atlas, children, id, value, className, style, tabIndex, title, onInvalid, onChange, ...props
}: SelectProps & { atlas: boolean }) {
  const field = useRef<HTMLSelectElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const [selection, setSelection] = useState('')
  const [invalid, setInvalid] = useState(false)
  const [portalContainer, setPortalContainer] = useState<HTMLElement>()

  useLayoutEffect(() => {
    if (atlas && field.current) setSelection(field.current.value)
  })

  useEffect(() => {
    if (!atlas) return
    const control = field.current
    const form = control?.form
    let frame = 0
    const reset = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        if (control) setSelection(control.value)
        setInvalid(false)
      })
    }
    form?.addEventListener('reset', reset)
    return () => {
      cancelAnimationFrame(frame)
      form?.removeEventListener('reset', reset)
    }
  }, [atlas])

  const options = atlas ? selectOptions(children) : []
  const selected = options.find(option => String(option.value ?? optionText(option.children)) === selection)
  const selectedLabel = selected?.label ?? optionText(selected?.children)
  return <>
    {atlas && <Select.Root
      value={selected ? `option:${selection}` : ''}
      disabled={props.disabled}
      onOpenChange={open => {
        if (open) {
          setPortalContainer(trigger.current?.closest<HTMLElement>('dialog, [role="dialog"]') ?? undefined)
        }
      }}
      onValueChange={next => {
        const control = field.current
        if (!control) return
        control.value = next.slice('option:'.length)
        setSelection(control.value)
        control.dispatchEvent(new Event('change', { bubbles: true }))
      }}
    >
      <Select.Trigger
        id={id} ref={trigger} className={className} style={style} title={title} tabIndex={tabIndex}
        data-slot="select-trigger"
        aria-label={props['aria-label']} aria-labelledby={props['aria-labelledby']}
        aria-required={props.required} aria-describedby={props['aria-describedby']} aria-invalid={invalid || props['aria-invalid']}
      >
        <Select.Value placeholder="Sem opções">{selectedLabel || undefined}</Select.Value>
        <Select.Icon asChild><ChevronDown size={16} aria-hidden="true" /></Select.Icon>
      </Select.Trigger>
      <Select.Portal container={portalContainer}>
        <Select.Content data-slot="select-content" position="popper" align="start" sideOffset={4} collisionPadding={8}>
          <Select.Viewport>
            {options.map(option => {
              const label = option.label ?? optionText(option.children)
              const originalValue = String(option.value ?? optionText(option.children))
              return <Select.Item key={originalValue} value={`option:${originalValue}`} disabled={option.disabled} data-slot="select-item">
                <Select.ItemText>{label}</Select.ItemText>
                <Select.ItemIndicator><Check size={16} aria-hidden="true" /></Select.ItemIndicator>
              </Select.Item>
            })}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>}
    <select
      {...props} ref={field} value={value} id={atlas ? undefined : id} style={atlas ? undefined : style}
      title={atlas ? undefined : title}
      className={atlas ? 'atlas-form-select' : className}
      aria-hidden={atlas || props['aria-hidden']} tabIndex={atlas ? -1 : tabIndex}
      onChange={event => {
        if (atlas) {
          setSelection(event.currentTarget.value)
          setInvalid(!event.currentTarget.validity.valid)
        }
        onChange?.(event)
      }}
      onInvalid={event => {
        if (atlas) {
          event.preventDefault()
          setInvalid(true)
          const form = event.currentTarget.form
          if (!form || form.querySelector(':invalid:not(fieldset)') === event.currentTarget) trigger.current?.focus()
        }
        onInvalid?.(event)
      }}
    >{children}</select>
  </>
}
