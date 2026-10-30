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
    patch({ comments: [...(task.comments ?? []), { id: `comment-${crypto.randomUUID()}`, author: people.find(p=>p.id==='joao')?.name||'Você', initials: people.find(p=>p.id==='joao')?.initials||'VC', body: comment.trim(), time: "Agora" }] }); setComment('')
  }

  return <>
    <button className="drawer-scrim" onClick={onClose} aria-label="Fechar tarefa" />
    <aside className="task-drawer" aria-label="Detalhes da tarefa">
      <div className="drawer-top">
        <div className="drawer-path"><ProjectIndicator project={project?.name ?? ''} /><span>/</span><span>{task.id.slice(0, 8).toUpperCase()}</span></div>
        <div className="drawer-top-actions"><button aria-label="Mais ações da tarefa" onClick={() => setMenu(value => !value)}><MoreHorizontal /></button><button onClick={onClose} aria-label="Fechar tarefa"><X /></button>{menu && <div className="drawer-action-menu"><button onClick={() => { onDelete(task.id); onClose() }}><Trash2 /> Excluir tarefa</button></div>}</div>
      </div>
      <div className="drawer-scroll">
        <div className="drawer-title-row"><button onClick={() => patch({ status: task.status === 'done' ? 'todo' : 'done', completedAt: task.status === 'done' ? undefined : new Date().toISOString() })}><StatusIcon status={task.status} /></button><input aria-label="Título da tarefa" value={task.title} onChange={event => patch({ title: event.target.value })} /></div>
        <textarea className="drawer-description editable" aria-label="Descrição da tarefa" value={task.description} onChange={event => patch({ description: event.target.value })} placeholder="Adicione uma descrição…" />
        <div className="drawer-quick-actions"><button className="focus-button" onClick={onFocus}><CirclePlay /> Iniciar foco <kbd>F</kbd></button><button onClick={onHandoff} disabled={people.length < 2}><ArrowRightLeft /> Transferir</button><button disabled title="Sugestões de próximas tarefas ainda não estão disponíveis"><Sparkles /> Sugestão indisponível</button></div>
        <div className="properties-grid">
          <span>Situação</span><label><StatusIcon status={task.status} /><select value={task.status} onChange={event => patch({ status: event.target.value as TaskStatus, completedAt: event.target.value === 'done' ? new Date().toISOString() : undefined })}><option value="backlog">Em espera</option><option value="todo">A fazer</option><option value="in-progress">Em andamento</option><option value="done">Concluído</option></select></label>
          <span>Responsável</span><label>{person ? <AssigneeAvatar person={person} size="sm" /> : <UserRound />}<select value={task.assigneeId ?? ''} onChange={event => patch({ assigneeId: event.target.value || undefined })}><option value="">Sem responsável</option>{people.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <span>Projeto</span><label><ProjectIndicator project={project?.name ?? ''} /><select value={task.projectId ?? ''} onChange={event => patch({ projectId: event.target.value || undefined })}><option value="">Sem projeto</option>{projects.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <span>Prioridade</span><label><PriorityIndicator priority={task.priority} showLabel={false} /><select value={task.priority} onChange={event => patch({ priority: event.target.value as Priority })}><option value="low">Baixa</option><option value="normal">Normal</option><option value="high">Alta</option><option value="urgent">Urgente</option></select></label>
          <span>Prazo</span><label><input type="date" value={task.dueDate ?? ''} onChange={event => patch({ dueDate: event.target.value || undefined })} /></label>
          <span>Objetivo</span><label><Orbit /><select value={task.objectiveId ?? ''} onChange={event => patch({ objectiveId: event.target.value || undefined })}><option value="">Sem objetivo</option>{objectives.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
        </div>
        {objective && <section className="drawer-section objective-card"><div className="section-heading"><Orbit /><h3>Objetivo</h3></div><div className="objective-path"><strong>{objective.title}</strong></div><p>A conclusão pode contribuir para o progresso deste objetivo.</p></section>}
        <section className="drawer-section checklist-section">
          <div className="section-heading"><CheckSquare /><h3>Lista de verificação</h3><span>{complete} / {task.checklist.length}</span></div>
          <div className="progress-track"><i style={{ width: `${progress}%` }} /></div>
          <div className="checklist-items">{task.checklist.map(item => <div className={`drawer-check-row ${item.completed ? 'done' : ''}`} key={item.id}><button onClick={() => patch({ checklist: task.checklist.map(entry => entry.id === item.id ? { ...entry, completed: !entry.completed } : entry) })}><span className="small-check">{item.completed && <Check />}</span></button><input value={item.text} onChange={event => patch({ checklist: task.checklist.map(entry => entry.id === item.id ? { ...entry, text: event.target.value } : entry) })} /><button aria-label="Remover item da lista" onClick={() => patch({ checklist: task.checklist.filter(entry => entry.id !== item.id) })}><Trash2 /></button></div>)}<div className="drawer-check-row"><span /><input placeholder="Adicionar item…" value={newCheck} onChange={event => setNewCheck(event.target.value)} onKeyDown={event => event.key === 'Enter' && addCheck()} /><button onClick={addCheck} aria-label="Adicionar item à lista">+</button></div></div>
        </section>
        <section className="drawer-section discussion-section">
          <div className="discussion-tabs"><button className={section === 'comments' ? 'active' : ''} onClick={() => setSection('comments')}>Comentários <span>{task.comments?.length ?? 0}</span></button><button className={section === 'activity' ? 'active' : ''} onClick={() => setSection('activity')}>Atividade</button></div>
          {section === 'comments' ? <><div className="comments">{task.comments?.map(item => <div className="comment" key={item.id}><span className="comment-avatar">{item.initials}</span><div><p><strong>{item.author}</strong><time>{item.time}</time></p><span>{item.body}</span></div></div>)}</div><div className="comment-composer"><textarea placeholder="Escreva um comentário…" value={comment} onChange={event => setComment(event.target.value)} /><div><span><button title="Mencionar" onClick={() => setComment(value => `${value}${value ? ' ' : ''}@${people.find(p=>p.id==='joao')?.name||'Você'} `)}><UserRound /></button><span className="comment-attachment" title="Anexos disponíveis no espaço compartilhado" aria-label="Anexos disponíveis no espaço compartilhado"><Paperclip /></span><button title="Link" onClick={() => setComment(value => `${value}${value ? ' ' : ''}https://`)}><Link2 /></button><button title="Código" onClick={() => setComment(value => `${value}${value ? ' ' : ''}\`code\``)}><Code2 /></button></span><button className="send-comment" disabled={!comment.trim()} onClick={sendComment}><Send /></button></div></div></> : <div className="activity-list">{task.activity?.map(item => <div key={item.id}><i /><p>{item.body}<time>{item.time}</time></p></div>)}{!task.activity?.length && <div className="drawer-empty">Nenhuma atividade ainda.</div>}</div>}
        </section>
      </div>
    </aside>
  </>
}
