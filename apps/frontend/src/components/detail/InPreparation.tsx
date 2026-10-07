import type { Alert } from '../../domain.ts'
import { useI18n } from '../../i18n/context.ts'
import { CheckIcon, SeverityIcon } from '../Icons.tsx'
import { StatusChip } from './blocks.tsx'

type Step = 'done' | 'in_progress' | 'pending'

const AGENTS = ['watcher', 'analyst', 'strategist'] as const

function steps(alert: Alert): [Step, Step, Step] {
  const text = (alert.agent ?? '').toLowerCase()
  if (alert.status === 'new') return ['done', 'pending', 'pending']
  if (/estratega|strategist|paso 3|step 3/.test(text)) return ['done', 'done', 'in_progress']
  return ['done', 'in_progress', 'pending']
}

export function InPreparation({ alert }: { alert: Alert }) {
  const { t, fmt } = useI18n()
  const p = t.preparing
  const state = steps(alert)
  return (
    <>
      <section className="detail-hero-min">
        <div className="card-meta">
          <span className={`chip-sev chip-sev--${alert.severity}`}>
            <SeverityIcon severity={alert.severity} />
            {alert.typeLabel}
          </span>
          <span>{alert.entityLabel}</span>
          <span>{t.common.since(fmt.date(alert.createdAt))}</span>
        </div>
        <h1>{alert.headline}</h1>
        <div>
          <StatusChip alert={alert} />
        </div>
      </section>
      <div className="detail-card detail-preparing">
        <div role="status" aria-live="polite">
          <strong className="detail-preparing-title">{p.title}</strong>
          <span className="detail-muted">
            {alert.agent ?? p.agentsWorking} {p.willNotify}
          </span>
        </div>
        <ol className="detail-steps">
          {AGENTS.map((a, i) => (
            <li key={a} className={`detail-step detail-step--${state[i]}`} aria-current={state[i] === 'in_progress' ? 'step' : undefined}>
              <span className="detail-step-name">
                {state[i] === 'done' ? (
                  <CheckIcon />
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className={state[i] === 'in_progress' ? 'spinning' : undefined}>
                    <circle cx="8" cy="8" r="6" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeDasharray: state[i] === 'in_progress' ? '26 12' : undefined }} />
                  </svg>
                )}
                {t.agents[a]} · {p.step[state[i]]}
              </span>
              <span className="detail-label">{state[i] === 'done' ? p.done[a] : p.pending[a]}</span>
            </li>
          ))}
        </ol>
        <div aria-hidden="true" className="detail-skeletons">
          <div className="card--skeleton" style={{ height: 14, width: '40%' }} />
          <div className="card--skeleton" style={{ height: 20, width: '85%' }} />
          <div className="detail-kpis">
            <div className="card--skeleton" style={{ height: 64 }} />
            <div className="card--skeleton" style={{ height: 64 }} />
            <div className="card--skeleton" style={{ height: 64 }} />
          </div>
        </div>
      </div>
    </>
  )
}
