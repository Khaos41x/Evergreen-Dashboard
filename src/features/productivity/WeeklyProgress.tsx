import { Check, Flag, Timer, Trophy } from 'lucide-react'
import type { Task } from '../../types'

export type SavedFocus = { id: string; createdAt: number; durationMs?: number }

function weeklyProgress(tasks: Task[], sessions: SavedFocus[], timezone?: string) {
  const now = Date.now()
  const calendar = new Intl.DateTimeFormat('sv-SE', { timeZone: timezone, dateStyle: 'short' })
  const monday = new Date(`${calendar.format(now)}T00:00:00Z`)
  monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7)
  const firstDay = monday.toISOString().slice(0, 10)
  const thisWeek = (timestamp: number) => Number.isFinite(timestamp) &&
    timestamp <= now && calendar.format(timestamp) >= firstDay

  const completed = new Set(tasks.filter(task => task.status === 'done' &&
    thisWeek(Date.parse(task.completedAt ?? ''))).map(task => task.id)).size

  const counted = new Set<string>()
  let focusMs = 0
  for (const session of sessions) {
    const duration = session.durationMs ?? 0
    if (!thisWeek(session.createdAt) || counted.has(session.id) || !Number.isFinite(duration) || duration <= 0) continue
    counted.add(session.id)
    focusMs += duration
  }

  const minutes = Math.floor(focusMs / 60_000)
  const xp = completed * 10 + Math.floor(minutes / 25) * 5
  return { completed, minutes, xp }
}

export function WeeklyProgress({ tasks, sessions, timezone }: { tasks: Task[]; sessions: SavedFocus[]; timezone?: string }) {
  const { completed, minutes, xp } = weeklyProgress(tasks, sessions, timezone)
  const level = Math.floor(xp / 50) + 1
  const progress = xp % 50
  const milestones = [
    { label: 'Primeira entrega', earned: completed >= 1, Icon: Flag },
    { label: '25 min de foco', earned: minutes >= 25, Icon: Timer },
    { label: 'Cinco entregas', earned: completed >= 5, Icon: Trophy },
  ]

  return (
    <section className="weekly-progress" aria-label="Progresso da semana">
      <div className="weekly-score">
        <header>
          <h2>Progresso da semana</h2>
          <strong>Nível {level}</strong>
        </header>
        <progress max={50} value={progress} aria-label={`${progress} de 50 XP para o próximo nível`} />
        <p>{xp} XP na semana <span>Faltam {50 - progress} XP para o próximo nível</span></p>
      </div>
      <div className="weekly-milestones">
        <p>{completed} {completed === 1 ? 'tarefa concluída' : 'tarefas concluídas'} · {minutes} min em foco</p>
        <ul aria-label="Conquistas da semana">
          {milestones.map(({ label, earned, Icon }) => (
            <li key={label} data-earned={earned}>
              {earned ? <Check size={15} aria-hidden="true" /> : <Icon size={15} aria-hidden="true" />}
              {label}<span className="sr-only">{earned ? ' conquistada' : ' pendente'}</span>
            </li>
          ))}
        </ul>
        <small>10 XP por tarefa concluída e 5 XP a cada 25 min de foco salvo.</small>
      </div>
    </section>
  )
}
