import { Blocks, PanelLeft } from 'lucide-react'
export function WorldModeSwitch({ world, onChange }: { world: boolean; onChange: (world: boolean) => void }) {
  return <div className="world-mode-switch" role="group" aria-label="Modo do Evergreen"><button aria-pressed={!world} onClick={() => onChange(false)}><PanelLeft size={15} />Trabalho</button><button aria-pressed={world} onClick={() => onChange(true)}><Blocks size={15} />Mapa</button></div>
}
