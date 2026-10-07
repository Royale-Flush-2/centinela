import { useState } from 'react'
import type { Lang, Severity } from '../domain.ts'
import { useI18n } from '../i18n/context.ts'
import { SearchIcon, SeverityIcon } from './Icons.tsx'


type DecisionType = 'approved' | 'executed' | 'rejected'
type Localized = Record<Lang, string>
type Outcome = { kind: 'pending' } | { kind: 'not_executed' } | { kind: 'actual'; amount: number; percent: number }

interface HistoryRow {
  decidedAt: string
  severity: Severity
  type: Localized
  headline: Localized
  decision: DecisionType
  who: string
  estimated: number
  outcome: Outcome
  note: Localized
}

const STOCKOUT: Localized = { es: 'Quiebre de inventario', en: 'Stockout' }
const OVERDUE: Localized = { es: 'Cartera vencida', en: 'Overdue receivables' }
const RETURNS: Localized = { es: 'Devoluciones', en: 'Returns' }

const ROWS: HistoryRow[] = [
  {
    decidedAt: '2026-10-01T16:20:00-05:00',
    severity: 'high',
    type: OVERDUE,
    headline: { es: 'Distribuciones La Ribera superó 45 días de mora', en: 'Distribuciones La Ribera went past 45 days overdue' },
    decision: 'approved',
    who: 'Laura Gómez',
    estimated: 96_300_000,
    outcome: { kind: 'pending' },
    note: { es: 'Crédito bloqueado y plan de pagos enviado al cliente.', en: 'Credit blocked and payment plan sent to the customer.' },
  },
  {
    decidedAt: '2026-09-30T11:05:00-05:00',
    severity: 'critical',
    type: STOCKOUT,
    headline: { es: 'El arroz blanco 5 kg se agotaba en el CEDI Cali', en: 'White rice 5 kg was running out at the Cali DC' },
    decision: 'executed',
    who: 'Laura Gómez',
    estimated: 312_400_000,
    outcome: { kind: 'actual', amount: 298_700_000, percent: 96 },
    note: { es: 'El traslado desde Medellín llegó el 1 oct.', en: 'The transfer from Medellín arrived on Oct 1.' },
  },
  {
    decidedAt: '2026-09-29T15:47:00-05:00',
    severity: 'medium',
    type: { es: 'Margen bajo política', en: 'Margin below policy' },
    headline: { es: 'Descuentos fuera de política en el canal mayorista del Eje Cafetero', en: 'Off-policy discounts in the Coffee Region wholesale channel' },
    decision: 'rejected',
    who: 'Laura Gómez',
    estimated: 41_200_000,
    outcome: { kind: 'not_executed' },
    note: {
      es: 'Motivo: ya lo estamos resolviendo por otra vía. «Comercial renegocia el 5 oct.»',
      en: 'Reason: we are already solving it another way. “Sales renegotiates on Oct 5.”',
    },
  },
  {
    decidedAt: '2026-09-27T09:12:00-05:00',
    severity: 'high',
    type: RETURNS,
    headline: { es: 'Devoluciones de lácteos en la ruta 4 de Medellín', en: 'Dairy returns on Medellín route 4' },
    decision: 'executed',
    who: 'Andrés Rojas',
    estimated: 58_000_000,
    outcome: { kind: 'actual', amount: 61_500_000, percent: 106 },
    note: { es: 'Se cambió la cadena de frío del vehículo.', en: 'The vehicle’s cold chain was replaced.' },
  },
  {
    decidedAt: '2026-09-25T07:30:00-05:00',
    severity: 'critical',
    type: STOCKOUT,
    headline: { es: 'El detergente 2 kg se agotaba en el CEDI Barranquilla', en: 'Detergent 2 kg was running out at the Barranquilla DC' },
    decision: 'executed',
    who: 'Laura Gómez',
    estimated: 204_900_000,
    outcome: { kind: 'actual', amount: 173_200_000, percent: 85 },
    note: { es: 'La orden urgente llegó un día tarde.', en: 'The rush order arrived one day late.' },
  },
  {
    decidedAt: '2026-09-23T14:05:00-05:00',
    severity: 'low',
    type: RETURNS,
    headline: { es: 'Devoluciones en la ruta 9 de Cali', en: 'Returns on Cali route 9' },
    decision: 'rejected',
    who: 'Andrés Rojas',
    estimated: 6_100_000,
    outcome: { kind: 'not_executed' },
    note: { es: 'Motivo: los datos no son correctos. «La ruta cambió de transportador.»', en: 'Reason: the data is wrong. “The route changed carriers.”' },
  },
  {
    decidedAt: '2026-09-22T10:40:00-05:00',
    severity: 'high',
    type: OVERDUE,
    headline: { es: 'Supermercado Los Andes llegó a 38 días de mora', en: 'Supermercado Los Andes reached 38 days overdue' },
    decision: 'executed',
    who: 'Laura Gómez',
    estimated: 118_700_000,
    outcome: { kind: 'actual', amount: 118_700_000, percent: 100 },
    note: { es: 'El cliente pagó después del bloqueo de crédito.', en: 'The customer paid after the credit block.' },
  },
]

const FILTERS: { id: 'all' | DecisionType; matches: (r: HistoryRow) => boolean }[] = [
  { id: 'all', matches: () => true },
  { id: 'approved', matches: (r) => r.decision !== 'rejected' },
  { id: 'rejected', matches: (r) => r.decision === 'rejected' },
  { id: 'executed', matches: (r) => r.decision === 'executed' },
]

const stripAccents = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export function History() {
  const { lang, t, fmt } = useI18n()
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all')
  const [search, setSearch] = useState('')

  const current = FILTERS.find((f) => f.id === filter) ?? FILTERS[0]
  const words = stripAccents(search).split(/\s+/).filter(Boolean)
  const rows = ROWS.filter(current.matches).filter((r) => {
    const text = stripAccents([r.headline[lang], r.type[lang], r.note[lang], r.who, t.history.decision[r.decision]].join(' '))
    return words.every((w) => text.includes(w))
  })

  const outcome = (o: Outcome) =>
    o.kind === 'pending' ? t.history.outcomePending : o.kind === 'not_executed' ? t.history.notExecuted : t.history.actual(fmt.money(o.amount), o.percent)

  const summary = [
    { label: t.history.kpi.approved, value: '5', note: t.history.kpi.approvedNote(fmt.money(790_300_000)) },
    { label: t.history.kpi.rejected, value: '2', note: t.history.kpi.rejectedNote },
    { label: t.history.kpi.actualProtected, value: fmt.money(652_100_000), note: t.history.kpi.actualProtectedNote(4) },
    { label: t.history.kpi.actualVsEstimated, value: '94%', note: t.history.kpi.actualVsEstimatedNote(fmt.money(652_100_000), fmt.money(694_000_000)) },
  ]

  return (
    <main className="content history">
      <div>
        <h1 className="history-title">{t.history.title}</h1>
        <p className="subtitle">{t.history.subtitle}</p>
      </div>

      <div className="history-summary">
        {summary.map((r) => (
          <div key={r.label} className="history-kpi">
            <span className="detail-label">{r.label}</span>
            <span className="history-kpi-value">{r.value}</span>
            <span className="detail-label">{r.note}</span>
          </div>
        ))}
      </div>

      <div className="history-bar">
        <div role="group" aria-label={t.history.filterByDecision} className="history-tabs">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" aria-pressed={f.id === filter} className={f.id === filter ? 'active' : undefined} onClick={() => setFilter(f.id)}>
              {t.history.tabs[f.id]} · {ROWS.filter(f.matches).length}
            </button>
          ))}
        </div>
        <label className="history-search">
          <span className="sr-only">{t.history.searchLabel}</span>
          <SearchIcon />
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.history.searchPlaceholder} />
        </label>
      </div>

      <div className="history-table">
        <div className="history-grid">
          <div className="history-row history-head" aria-hidden="true">
            <span>{t.history.columns.decided}</span>
            <span>{t.history.columns.alert}</span>
            <span>{t.history.columns.decision}</span>
            <span className="right">{t.history.columns.protected}</span>
            <span>{t.history.columns.reason}</span>
            <span />
          </div>
          <ul aria-label={t.history.listLabel}>
            {rows.map((r) => (
              <li key={r.headline.es} className="history-row">
                <span className="history-date">
                  <span>{fmt.date(r.decidedAt)}</span>
                  <span className="detail-label">{fmt.time(r.decidedAt)}</span>
                </span>
                <span className="history-alert">
                  <span className="history-meta">
                    <span className={`detail-decision-sev detail-decision-sev--${r.severity}`}>
                      <SeverityIcon severity={r.severity} withMark={false} />
                      {t.severity[r.severity]}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{r.type[lang]}</span>
                  </span>
                  <span className="history-headline">{r.headline[lang]}</span>
                </span>
                <span className="history-decision">
                  <span className={`history-chip history-chip--${r.decision}`}>
                    <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true">
                      {r.decision === 'rejected' ? (
                        <path d="M4 4l8 8M12 4l-8 8" style={{ stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' }} />
                      ) : (
                        <path d="M3.5 8.5l3 3 6-7" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }} />
                      )}
                    </svg>
                    {t.history.decision[r.decision]}
                  </span>
                  <span className="detail-label">{t.history.by(r.who)}</span>
                </span>
                <span className="history-amount">
                  <span>{fmt.money(r.estimated)}</span>
                  <span className="detail-label">{outcome(r.outcome)}</span>
                </span>
                <span className="history-note">{r.note[lang]}</span>
                <button type="button" className="btn btn--small" disabled title={t.history.sampleTitle} aria-label={t.history.viewSampleLabel(r.headline[lang])}>
                  {t.common.view}
                </button>
              </li>
            ))}
          </ul>
          {rows.length === 0 && <p className="history-empty">{t.history.noMatches}</p>}
        </div>
      </div>
    </main>
  )
}
