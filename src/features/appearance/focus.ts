const navigationKeys = new Set(['Tab', 'Enter', 'Escape', 'ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End'])
const modifierKeys = new Set(['Shift', 'Control', 'Alt', 'Meta'])

export function initializeFocusModality() {
  const root = document.documentElement
  root.dataset.inputModality = 'keyboard'
  const pointer = () => { root.dataset.inputModality = 'pointer' }
  const keyboard = (event: KeyboardEvent) => {
    const toastShortcut = event.altKey && event.code === 'KeyT'
    if ((event.metaKey || event.ctrlKey || event.altKey) && !toastShortcut) return

    const target = event.target
    const editing = target instanceof HTMLElement &&
      (target.matches('textarea, input:not([type="radio"], [type="checkbox"], [type="button"], [type="submit"])') ||
        target.isContentEditable)
    const navigating = navigationKeys.has(event.key) &&
      (!editing || ['Tab', 'Enter', 'Escape'].includes(event.key))
    if (toastShortcut || navigating || (!editing && !modifierKeys.has(event.key))) {
      root.dataset.inputModality = 'keyboard'
    }
  }
  document.addEventListener('pointerdown', pointer, true)
  document.addEventListener('keydown', keyboard, true)
  import.meta.hot?.dispose(() => {
    document.removeEventListener('pointerdown', pointer, true)
    document.removeEventListener('keydown', keyboard, true)
  })
}
