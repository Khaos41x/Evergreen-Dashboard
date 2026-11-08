export const themes = [
  { id: 'atlas', label: 'Atlas', description: 'Preto puro e azul gelo' },
  { id: 'evergreen', label: 'Verde Evergreen', description: 'Original da marca' },
  { id: 'black', label: 'Preto', description: 'Preto puro e prata' },
  { id: 'electric', label: 'Azul Elétrico', description: 'Azul vivo sobre noite' },
  { id: 'light', label: 'Claro', description: 'Papel branco e linhas suaves' },
] as const

export type Theme = (typeof themes)[number]['id']
const storageKey = 'evergreen.appearance.v1'

function resolveTheme(value: string | null): Theme {
  return themes.find(theme => theme.id === value)?.id ?? 'atlas'
}

export function initializeTheme() {
  try {
    document.documentElement.dataset.theme = resolveTheme(localStorage.getItem(storageKey))
  } catch {
    document.documentElement.dataset.theme = 'atlas'
  }

  window.addEventListener('storage', event => {
    if (event.key === storageKey) applyTheme(resolveTheme(event.newValue))
  })
}

export function currentTheme() {
  return resolveTheme(document.documentElement.dataset.theme ?? null)
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  window.dispatchEvent(new Event('evergreen:theme'))
}

export function subscribeTheme(listener: () => void) {
  window.addEventListener('evergreen:theme', listener)
  return () => window.removeEventListener('evergreen:theme', listener)
}

export function selectTheme(theme: Theme) {
  applyTheme(theme)
  try {
    localStorage.setItem(storageKey, theme)
    return true
  } catch {
    return false
  }
}
