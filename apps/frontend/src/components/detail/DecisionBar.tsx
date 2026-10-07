import { useState } from 'react'
import type { ActionData, Decision, DecisionData } from '../../detail.ts'
import type { Alert } from '../../domain.ts'
import { useI18n } from '../../i18n/context.ts'
import { SeverityIcon } from '../Icons.tsx'

type Mode = 'base' | 'edit' | 'reject'

interface Props {
  data: DecisionData
  actions: ActionData[]
  selection: Record<string, boolean>
  amountAtRisk: number
  alert: Alert
  decision: Decision | null
  mode: Mode
  setMode: (m: Mode) => void
  sending: boolean
  onApprove: (protects: number) => void
  onReject: (reason: string, details: string) => void
}

function protection(data: DecisionData, actions: ActionData[], ids: string[], cap: number) {
  const key = [...ids].sort().join('+')
  const row = data.combinations?.rows.find((r) => String(r.actions).split('+').map((s) => s.trim()).sort().join('+') === key)
  if (row?.protects) return row.protects.value
  const sum = actions.filter((a) => ids.includes(a.id)).reduce((s, a) => s + (a.protects?.value ?? 0), 0)
  return Math.min(sum, cap)
}

export function DecisionBar({ data, actions, selection, amountAtRisk, alert, decision, mode, setMode, sending, onApprove, onReject }: Props) {
  const { t, fmt } = useI18n()
  const d = t.decision
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')

  const money = (v: number) => (v < 50_000 ? '$0' : fmt.money(v))
  const ids = actions.filter((a) => selection[a.id]).map((a) => a.id)
  const n = ids.length
  const protects = n ? protection(data, actions, ids, amountAtRisk) : 0
  const cost = actions.filter((a) => ids.includes(a.id)).reduce((s, a) => s + (a.cost?.value ?? 0), 0)
  const reasons = data.rejection_reasons ?? []
  const noReasons = reasons.length === 0
  const isOther = noReasons || (reason !== '' && reason === reasons[reasons.length - 1])
  const canReject = (noReasons || reason !== '') && (!isOther || details.trim() !== '')

  let content
  if (alert.status !== 'proposal') {
    const approved = alert.status === 'approved' || alert.status === 'executed'
    content = (
      <div role="status" className={`detail-closed detail-closed--${approved ? 'ok' : alert.status === 'rejected' ? 'cr' : 'mu'}`}>
        <span className="detail-closed-text">
          <strong>
            {decision?.type === 'approved'
              ? d.youApproved(decision.actions?.length ?? 0, decision.protects ? money(decision.protects) : null)
              : decision?.type === 'rejected'
                ? d.youRejected
                : d.alertIs(t.status[alert.status].toLowerCase())}
          </strong>
          <span>
            {decision?.type === 'approved'
              ? d.approvedNext
              : decision?.type === 'rejected'
                ? d.rejectedNext(decision.reason ?? d.noReason)
                : alert.status === 'new' || alert.status === 'analyzing'
                  ? d.stillPreparing
                  : d.alreadyDecided}
          </span>
        </span>
        <a className="btn btn--large" href="#/history">
          {d.viewInHistory}
        </a>
      </div>
    )
  } else if (mode === 'reject') {
    content = (
      <fieldset className="detail-reject">
        <legend>
          {d.whyReject} <span className="detail-required">{d.required}</span>
        </legend>
        {!noReasons && (
          <div className="detail-reasons">
            {reasons.map((m, i) => (
              <label key={m} htmlFor={`reason-${i}`} className={`detail-reason${reason === m ? ' detail-reason--active' : ''}`}>
                <input type="radio" name="reason" id={`reason-${i}`} checked={reason === m} onChange={() => setReason(m)} />
                {m}
              </label>
            ))}
          </div>
        )}
        <label htmlFor="detail-reason-text" className="detail-label detail-label--strong">
          {d.tellTeam} {!noReasons && <span className="detail-label">{isOther ? d.requiredForOther : d.optional}</span>}
        </label>
        <textarea id="detail-reason-text" rows={2} value={details} onChange={(e) => setDetails(e.target.value)} placeholder={d.reasonPlaceholder} />
        <div className="detail-row-between">
          <span role="status" className="detail-label">
            {!noReasons && !reason ? d.pickReason : !canReject ? d.writeReason : d.readyToReject}
          </span>
          <div className="buttons">
            <button type="button" className="btn btn--large" onClick={() => setMode('base')}>
              {t.common.cancel}
            </button>
            <button
              type="button"
              className="btn btn--large btn--danger"
              disabled={!canReject || sending}
              onClick={() => (noReasons ? onReject(details.trim(), '') : onReject(reason, details))}
            >
              {d.confirmReject}
            </button>
          </div>
        </div>
      </fieldset>
    )
  } else if (mode === 'edit') {
    content = (
      <div className="detail-row-between">
        <div role="status" className="detail-decision-summary">
          <strong>{d.editingTitle}</strong>
          <span className="detail-label">{d.editingText}</span>
        </div>
        <div className="buttons">
          <button type="button" className="btn btn--large" onClick={() => setMode('base')}>
            {t.common.cancel}
          </button>
          <button type="button" className="btn btn--primary btn--cta" disabled={n === 0 || sending} onClick={() => onApprove(protects)}>
            {d.saveAndApprove}
          </button>
        </div>
      </div>
    )
  } else {
    const covers = amountAtRisk > 0 ? Math.min(100, Math.round((protects / amountAtRisk) * 100)) : 0
    content = (
      <div className="detail-decision-base">
        <div role="status" className="detail-decision-summary">
          <span className="detail-decision-id">
            <span className={`detail-decision-sev detail-decision-sev--${alert.severity}`}>
              <SeverityIcon severity={alert.severity} withMark={false} />
              {t.severity[alert.severity]}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {alert.id} · {alert.typeLabel}
            </span>
          </span>
          <strong className="detail-decision-title">{n === 0 ? d.pickAtLeastOne : d.actionsProtect(n, money(protects), money(amountAtRisk))}</strong>
          <div className="detail-coverage">
            <span className="detail-coverage-bar" aria-hidden="true">
              <span style={{ width: `${covers}%` }} />
            </span>
            <span className="detail-label">
              {n === 0 ? d.noActionsRisk : d.coverage(covers, money(cost), money(Math.max(amountAtRisk - protects, 0)))}
            </span>
          </div>
        </div>
        <div className="buttons">
          <button type="button" className="btn btn--large btn--text-danger" onClick={() => setMode('reject')}>
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" style={{ stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' }} />
            </svg>
            {t.common.reject}
          </button>
          {actions.some((a) => a.quantity != null) && (
            <button type="button" className="btn btn--large" onClick={() => setMode('edit')}>
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M10.5 2.5l3 3L6 13H3v-3z" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinejoin: 'round' }} />
              </svg>
              {t.common.edit}
            </button>
          )}
          <button type="button" className="btn btn--primary btn--cta" disabled={n === 0 || sending} onClick={() => onApprove(protects)}>
            <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3.5 8.5l3 3 6-7" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }} />
            </svg>
            <span className="btn-cta-text">
              <span>{n === 0 ? t.common.approve : d.approveN(n)}</span>
              <span>{n === 0 ? d.pickAtLeastOneShort : d.protectsPerMonth(money(protects))}</span>
            </span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="detail-decision" role="region" aria-label={d.regionLabel}>
      <div className="detail-decision-inner">{content}</div>
    </div>
  )
}
