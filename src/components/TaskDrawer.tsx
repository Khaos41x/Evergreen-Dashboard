import { useEffect, useState } from 'react'
import { ArrowRightLeft, Check, CheckSquare, CirclePlay, Code2, Link2, MoreHorizontal, Orbit, Paperclip, Send, Sparkles, Trash2, UserRound, X } from 'lucide-react'
import type { Objective, Person, Priority, Project, Task, TaskStatus } from '../types'
import { AssigneeAvatar, PriorityIndicator, ProjectIndicator, StatusIcon } from './ui'

export function TaskDrawer({ task, people, projects, objectives, onClose, onUpdate, onDelete, onHandoff, onSuggest, onFocus }: { task: Task | null; people: Person[]; projects: Project[]; objectives: Objective[]; onClose: () => void; onUpdate: (task: Task) => void; onDelete: (taskId: string) => void; onHandoff: () => void; onSuggest: () => void; onFocus: () => void }) {
  const [comment, setComment] = useState('')
  const [newCheck, setNewCheck] = useState('')
  const [section, setSection] = useState<'comments' | 'activity'>('comments')
  const [menu, setMenu] = useState(false)
  useEffect(() => { setComment(''); setNewCheck(''); setMenu(false) }, [task?.id])
  if (!task) return null
  const person = people.find(item => item.id === task.assigneeId)
  const project = projects.find(item => item.id === task.projectId)
  const objective = objectives.find(item => item.id === task.objectiveId)
  const complete = task.checklist.filter(item => item.completed).length
  const progress = task.checklist.length ? (complete / task.checklist.length) * 100 : 0
  const patch = (changes: Partial<Task>) => onUpdate({ ...task, ...changes })
  const addCheck = () => {
    if (!newCheck.trim()) return
    patch({ checklist: [...task.checklist, { id: `check-${crypto.randomUUID()}`, text: newCheck.trim(), completed: false }] }); setNewCheck('')
  }
  const sendComment = () => {
    if (!comment.trim()) return
    patch({ comments: [...(task.comments ?? []), { id: `comment-${crypto.randomUUID()}`, author: people.find(p=>p.id==='joao')?.name||'Você', initials: people.find(p=>p.id==='joao')?.initials||'VC', body: comment.trim(), time: 'Just now' }] }); setComment('')
  }

  return <>
    <button className="drawer-scrim" onClick={onClose} aria-label="Close task" />
    <aside className="task-drawer" aria-label="Task details">
      <div className="drawer-top">
        <div className="drawer-path"><ProjectIndicator project={project?.name ?? ''} /><span>/</span><span>{task.id.slice(0, 8).toUpperCase()}</span></div>
        <div className="drawer-top-actions"><button aria-label="More task actions" onClick={() => setMenu(value => !value)}><MoreHorizontal /></button><button onClick={onClose} aria-label="Close task"><X /></button>{menu && <div className="drawer-action-menu"><button onClick={() => { onDelete(task.id); onClose() }}><Trash2 /> Delete task</button></div>}</div>
      </div>
      <div className="drawer-scroll">
        <div className="drawer-title-row"><button onClick={() => patch({ status: task.status === 'done' ? 'todo' : 'done', completedAt: task.status === 'done' ? undefined : new Date().toISOString() })}><StatusIcon status={task.status} /></button><input aria-label="Task title" value={task.title} onChange={event => patch({ title: event.target.value })} /></div>
        <textarea className="drawer-description editable" aria-label="Task description" value={task.description} onChange={event => patch({ description: event.target.value })} placeholder="Add a description…" />
        <div className="drawer-quick-actions"><button className="focus-button" onClick={onFocus}><CirclePlay /> Start Focus <kbd>F</kbd></button><button onClick={onHandoff} disabled={people.length < 2}><ArrowRightLeft /> Hand off</button><button disabled title="Follow-up suggestions are not available yet"><Sparkles /> Suggest unavailable</button></div>
        <div className="properties-grid">
          <span>Status</span><label><StatusIcon status={task.status} /><select value={task.status} onChange={event => patch({ status: event.target.value as TaskStatus, completedAt: event.target.value === 'done' ? new Date().toISOString() : undefined })}><option value="backlog">Backlog</option><option value="todo">Todo</option><option value="in-progress">In Progress</option><option value="done">Done</option></select></label>
          <span>Assignee</span><label>{person ? <AssigneeAvatar person={person} size="sm" /> : <UserRound />}<select value={task.assigneeId ?? ''} onChange={event => patch({ assigneeId: event.target.value || undefined })}><option value="">Unassigned</option>{people.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <span>Project</span><label><ProjectIndicator project={project?.name ?? ''} /><select value={task.projectId ?? ''} onChange={event => patch({ projectId: event.target.value || undefined })}><option value="">No project</option>{projects.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <span>Priority</span><label><PriorityIndicator priority={task.priority} showLabel={false} /><select value={task.priority} onChange={event => patch({ priority: event.target.value as Priority })}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></label>
          <span>Due</span><label><input type="date" value={task.dueDate ?? ''} onChange={event => patch({ dueDate: event.target.value || undefined })} /></label>
          <span>Objective</span><label><Orbit /><select value={task.objectiveId ?? ''} onChange={event => patch({ objectiveId: event.target.value || undefined })}><option value="">No objective</option>{objectives.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
        </div>
        {objective && <section className="drawer-section objective-card"><div className="section-heading"><Orbit /><h3>Objective</h3></div><div className="objective-path"><strong>{objective.title}</strong></div><p>Completion can contribute to this objective's progress.</p></section>}
        <section className="drawer-section checklist-section">
          <div className="section-heading"><CheckSquare /><h3>Checklist</h3><span>{complete} / {task.checklist.length}</span></div>
          <div className="progress-track"><i style={{ width: `${progress}%` }} /></div>
          <div className="checklist-items">{task.checklist.map(item => <div className={`drawer-check-row ${item.completed ? 'done' : ''}`} key={item.id}><button onClick={() => patch({ checklist: task.checklist.map(entry => entry.id === item.id ? { ...entry, completed: !entry.completed } : entry) })}><span className="small-check">{item.completed && <Check />}</span></button><input value={item.text} onChange={event => patch({ checklist: task.checklist.map(entry => entry.id === item.id ? { ...entry, text: event.target.value } : entry) })} /><button aria-label="Remove checklist item" onClick={() => patch({ checklist: task.checklist.filter(entry => entry.id !== item.id) })}><Trash2 /></button></div>)}<div className="drawer-check-row"><span /><input placeholder="Add item…" value={newCheck} onChange={event => setNewCheck(event.target.value)} onKeyDown={event => event.key === 'Enter' && addCheck()} /><button onClick={addCheck} aria-label="Add checklist item">+</button></div></div>
        </section>
        <section className="drawer-section discussion-section">
          <div className="discussion-tabs"><button className={section === 'comments' ? 'active' : ''} onClick={() => setSection('comments')}>Comments <span>{task.comments?.length ?? 0}</span></button><button className={section === 'activity' ? 'active' : ''} onClick={() => setSection('activity')}>Activity</button></div>
          {section === 'comments' ? <><div className="comments">{task.comments?.map(item => <div className="comment" key={item.id}><span className="comment-avatar">{item.initials}</span><div><p><strong>{item.author}</strong><time>{item.time}</time></p><span>{item.body}</span></div></div>)}</div><div className="comment-composer"><textarea placeholder="Write a comment…" value={comment} onChange={event => setComment(event.target.value)} /><div><span><button title="Mention" onClick={() => setComment(value => `${value}${value ? ' ' : ''}@{people.find(p=>p.id==='joao')?.name||'Você'} `)}><UserRound /></button><span className="comment-attachment" title="Uploads unavailable in local mode" aria-label="Uploads unavailable in local mode"><Paperclip /></span><button title="Link" onClick={() => setComment(value => `${value}${value ? ' ' : ''}https://`)}><Link2 /></button><button title="Code" onClick={() => setComment(value => `${value}${value ? ' ' : ''}\`code\``)}><Code2 /></button></span><button className="send-comment" disabled={!comment.trim()} onClick={sendComment}><Send /></button></div></div></> : <div className="activity-list">{task.activity?.map(item => <div key={item.id}><i /><p>{item.body}<time>{item.time}</time></p></div>)}{!task.activity?.length && <div className="drawer-empty">No activity yet.</div>}</div>}
        </section>
      </div>
    </aside>
  </>
}
