import { useEffect } from 'react'

export function AppViewport() {
  useEffect(() => {
    const root=document.documentElement
    const viewport=window.visualViewport
    const update=()=>{
      if(viewport && viewport.scale===1) {
        root.style.setProperty('--app-height',viewport.height+'px')
        root.style.setProperty('--keyboard-inset',Math.max(0,window.innerHeight-viewport.height-viewport.offsetTop)+'px')
      } else {
        root.style.removeProperty('--app-height')
        root.style.removeProperty('--keyboard-inset')
      }
    }
    update()
    window.addEventListener('resize',update)
    viewport?.addEventListener('resize',update)
    viewport?.addEventListener('scroll',update)
    return ()=>{
      window.removeEventListener('resize',update)
      viewport?.removeEventListener('resize',update)
      viewport?.removeEventListener('scroll',update)
      root.style.removeProperty('--app-height')
      root.style.removeProperty('--keyboard-inset')
    }
  },[])
  return null
}
