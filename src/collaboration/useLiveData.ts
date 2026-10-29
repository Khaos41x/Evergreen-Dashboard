import { useCallback, useEffect, useRef, useState } from 'react'
import { checked, db, failure } from './client'
import type { Channel, Member, RecordItem, Workspace } from './models'

export function useLiveData(userId: string, workspaceId: string) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [channels, setChannels] = useState<Channel[]>([])
  const [joined, setJoined] = useState<string[]>([])
  const [records, setRecords] = useState<RecordItem[]>([])
  const [unread,setUnread]=useState<Record<string,number>>({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadedWorkspaceId, setLoadedWorkspaceId] = useState<string | null>(null)
  const generation = useRef(0)
  const activeWorkspace = useRef(workspaceId)
  activeWorkspace.current = workspaceId
  const refresh = useCallback(async () => {
    if (activeWorkspace.current !== workspaceId) return
    const current = ++generation.current
    try {
      const ws = await checked(db().from('eg_workspaces').select('*').order('created_at'))
      if (current !== generation.current || activeWorkspace.current !== workspaceId) return
      setWorkspaces(ws)
      if (workspaceId) {
        const [m, c, r, j] = await Promise.all([
          checked(db().from('eg_members').select('*').eq('workspace_id', workspaceId)),
          checked(db().from('eg_channels').select('*').eq('workspace_id', workspaceId).order('name')),
          checked(db().from('eg_records').select('*').eq('workspace_id', workspaceId).order('id')),
          checked(db().from('eg_channel_members').select('channel_id').eq('user_id', userId)),
        ])
        if (current !== generation.current || activeWorkspace.current !== workspaceId) return
        setMembers(m); setChannels(c); setRecords(r); setJoined(j.map(item => item.channel_id))
        const countsResult=await db().rpc('eg_unread_counts',{p_workspace:workspaceId})
        if(countsResult.error&&!['PGRST202','42883'].includes(countsResult.error.code))throw countsResult.error
        const counts=(countsResult.data??[]) as {channel_id:string;unread_count:number}[]
        if(current!==generation.current||activeWorkspace.current!==workspaceId)return
        setUnread(Object.fromEntries(counts.map(c=>[c.channel_id,Number(c.unread_count)])))
      }
      setLoadedWorkspaceId(workspaceId)
      setError('')
    } catch (e) { if (current === generation.current && activeWorkspace.current === workspaceId) { setError(failure(e)); setLoadedWorkspaceId(workspaceId) } }
    finally { if (current === generation.current) setLoading(false) }
  }, [workspaceId, userId])
  useEffect(() => {
    setMembers([]); setChannels([]); setRecords([]); setJoined([]); setLoading(true)
    void refresh()
    const live = db().channel(`workspace-${userId}-${workspaceId}`)
    for (const table of ['eg_records', 'eg_members', 'eg_channels']) live.on('postgres_changes', { event: '*', schema: 'public', table, filter: `workspace_id=eq.${workspaceId}` }, () => void refresh())
    live.on('postgres_changes', { event: '*', schema: 'public', table: 'eg_channel_members', filter: `user_id=eq.${userId}` }, () => void refresh())
    live.on('postgres_changes',{event:'*',schema:'public',table:'eg_messages'},()=>void refresh())
    live.on('postgres_changes',{event:'*',schema:'public',table:'eg_reads',filter:`user_id=eq.${userId}`},()=>void refresh())
    live.subscribe(() => void refresh())
    // RLS revocation may prevent DELETE delivery. Re-fetch on focus and bounded polling.
    const timer = window.setInterval(() => void refresh(), 15000)
    window.addEventListener('focus', refresh)
    return () => { generation.current++; clearInterval(timer); window.removeEventListener('focus', refresh); void db().removeChannel(live) }
  }, [refresh, workspaceId, userId])
  const scoped = loadedWorkspaceId === workspaceId
  return { workspaces, members: scoped ? members : [], channels: scoped ? channels : [], joined: scoped ? joined : [], records: scoped ? records : [], unread:scoped?unread:{}, error, loading: loading || !scoped, loadedWorkspaceId, refresh }
}
