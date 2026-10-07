import { CONFIDENCE_BARS, PENDING_STATUSES, type AlertResult } from '../domain.ts'
import { useI18n } from '../i18n/context.ts'
import { AgentIcon, SeverityIcon, SparkleIcon } from './Icons.tsx'
import { Sparkline } from './Sparkline.tsx'

export function ConfidenceChip({ bars, label }: { bars: number; label: string }) {
  const color = (n: number) => (n <= bars ? 'var(--fg)' : 'var(--bd)')
  return (
    <span className="chip-confidence">
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        <rect x="0.5" y="7" width="3" height="4.5" rx="0.8" style={{ fill: color(1) }} />
        <rect x="4.5" y="4" width="3" height="7.5" rx="0.8" style={{ fill: color(2) }} />
        <rect x="8.5" y="1" width="3" height="10.5" rx="0.8" style={{ fill: color(3) }} />
      </svg>
      {label}
    </span>
  )
}

interface Props {
  alert: AlertResult
  busy: boolean
  onDecide: (alert: AlertResult, action: 'approve' | 'reject') => void
}

export function AlertCard({ alert: a, busy, onDecide }: Props) {
  const { t, fmt } = useI18n()
  const pending = PENDING_STATUSES.includes(a.status)
  const locked = a.status !== 'proposal' || busy
  const sev = t.severity[a.severity]

  return (
    <article id={`alert-${a.id}`} className="card" aria-label={t.card.ariaLabel(sev.toLowerCase(), a.headline, fmt.money(a.amountAtRisk))}>
      <div className="card-body">
        <div className="card-meta">
          <span className={`chip-sev chip-sev--${a.severity}`}>
            <SeverityIcon severity={a.severity} />
            {sev}
          </span>
          <span className="card-type">{a.typeLabel}</span>
          <span aria-hidden="true">·</span>
          <span>{a.entityLabel}</span>
          <ConfidenceChip bars={CONFIDENCE_BARS[a.confidence]} label={t.confidence[a.confidence]} />
          <span>{t.common.since(fmt.date(a.createdAt))}</span>
        </div>
        <h3 className="card-headline">{a.headline}</h3>
        <div className="card-status">
          <span className="chip-status">{t.status[a.status]}</span>
          {a.agent && (
            <span className="card-agent">
              <AgentIcon />
              {a.agent}
            </span>
          )}
          {a.matches && a.matches.length > 0 && (
            <span className="card-match">
              <SparkleIcon />
              {t.card.matchesBy(a.matches.join(', '))}
            </span>
          )}
        </div>
      </div>

      <Sparkline series={a.series} severity={a.severity} />

      <div className="card-actions">
        <div>
          <div className="card-amount">{fmt.money(a.amountAtRisk)}</div>
          <div className="card-amount-label">{pending ? t.card.atRiskPerMonth : t.card.assessedPerMonth}</div>
        </div>
        <div className="buttons">
          <a className="btn" href={`#/alert/${encodeURIComponent(a.id)}`} aria-label={t.card.viewDetail(a.headline)}>
            {t.common.view}
          </a>
          {pending && (
            <>
              <button type="button" className="btn btn--primary" disabled={locked} aria-label={t.card.approveLabel(a.headline)} onClick={() => onDecide(a, 'approve')}>
                {t.common.approve}
              </button>
              <button type="button" className="btn" disabled={locked} aria-label={t.card.rejectLabel(a.headline)} onClick={() => onDecide(a, 'reject')}>
                {t.common.reject}
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  )
}
