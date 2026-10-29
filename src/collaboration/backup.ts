export function downloadLocal() {
  const payload = { exportedAt: new Date().toISOString(), workspace: localStorage.getItem('evergreen.workspace.v1'), focus: localStorage.getItem('evergreen.focus-session.v1') }
  const link = document.createElement('a')
  link.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }))
  link.download = `evergreen-backup-${Date.now()}.json`
  link.hidden = true
  document.body.append(link)
  link.click()
  setTimeout(() => { URL.revokeObjectURL(link.href); link.remove() }, 10000)
}
