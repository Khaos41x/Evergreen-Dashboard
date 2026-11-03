export type WorldPresence = 'online' | 'away' | 'focusing' | 'unknown' | 'local' | 'offline'
export interface WorldMember { id: string; name: string; presence: WorldPresence; seat?:number;seatNumber?:number;vacant?:boolean;lastSeen?:string|null; jobTitle?:string; company?:string; focus?:string; avatarUrl?:string;officeName?:string }
export interface WorldTask { id: string; title: string; status: string; projectId: string | null; assigneeId: string | null; progress: number; canComplete: boolean }
export interface WorldProject { id: string; name: string; description: string }
export interface WorldActivity { id: string; title: string; actorId: string | null; resourceId: string | null; at: string }
export interface WorldChannel { id: string; name: string }
export interface WorldData {
  scope: string; name: string; source: 'local' | 'workspace'; userId: string
  members: WorldMember[]; projects: WorldProject[]; tasks: WorldTask[]; activity: WorldActivity[]; channels: WorldChannel[]
  scene?:'founders-library';presenceError?: string; error?: string; loading?: boolean
}
export type WorldSelection = { kind: 'member' | 'project'; id: string } | null
export interface WorldActions {
  onOpenEconomy?:()=>void; onOpenFounders?:()=>void
  onOpenTask: (id: string) => void; onOpenProject: (id: string) => void
  onCompleteTask?: (id: string) => Promise<void>; onFocusTask?: (id: string) => void
  onOpenChannel?: (id: string) => void; onCreateTask?: () => void;onRenameOffice?:(name:string)=>Promise<void>
}
export const presenceLabels: Record<WorldPresence, string> = { offline:'Offline',online: 'Disponível', away: 'Ausente', focusing: 'Em foco', unknown: 'Presença não verificada', local: 'Somente neste navegador' }
export function tasksFor(data: WorldData, selection: WorldSelection) {
  if (!selection) return []
  return data.tasks.filter(t => selection.kind === 'member' ? t.assigneeId === selection.id : t.projectId === selection.id)
}
export function completion(tasks: WorldTask[]) {
  return tasks.length ? Math.round(100 * tasks.filter(t => t.status === 'done').length / tasks.length) : null
}
export function layoutWorld(memberCount: number, projectCount: number, slots?:number[]) {
  const width=22,depth=20
  const stations=Array.from({length:Math.min(memberCount,12)},(_,i)=>{const slot=(slots?.[i]??i)%12;return [([-5.25,-2.05,2.05,5.25][slot%4]),0,-5+Math.floor(slot/4)*4] as [number,number,number]})
  const rooms=Array.from({length:Math.min(projectCount,6)},(_,i)=>[(i<3?-1:1)*8.8,0,-5+(i%3)*4] as [number,number,number])
  return {width,depth,stations,rooms}
}

export const libraryStations:[number,number,number][]=[[-5,0,3],[1,0,-3],[6,0,5]]
export const libraryVault:[number,number,number]=[-10,0,0]
export function layoutLibrary(slots:number[]){return{width:26,depth:20,stations:slots.map(s=>libraryStations[Math.max(0,Math.min(2,s))]),rooms:[] as [number,number,number][]}}
