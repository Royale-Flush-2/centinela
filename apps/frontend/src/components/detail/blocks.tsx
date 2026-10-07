import { useState, type ReactNode } from 'react'
import type {
  ActionData,
  CalculationData,
  CauseData,
  ChatData,
  Decision,
  DoubtData,
  EvidenceData,
  HeroData,
  KpiData,
  LogData,
  RuleData,
} from '../../detail.ts'
import { CONFIDENCE_BARS, SEVERITIES, type Alert, type Confidence, type Severity } from '../../domain.ts'
import { useI18n } from '../../i18n/context.ts'
import { ConfidenceChip } from '../AlertCard.tsx'
import { CheckIcon, SeverityIcon } from '../Icons.tsx'
import { LineChart } from './LineChart.tsx'

export interface Ctx {
  alert: Alert
  canDecide: boolean
  editing: boolean
  selection: Record<string, boolean>
  toggle: (id: string) => void
  quantities: Record<string, string>
  setQuantity: (id: string, value: string) => void
  decision: Decision | null
}

interface BlockProps {
  data: unknown
  ctx: Ctx
  index: number
}

export const COLOR: Record<string, string> = {
  cr: 'var(--critical)',
  al: 'var(--high)',
  me: 'var(--medium)',
  ba: 'var(--low)',
  ok: 'var(--ok)',
}

const isSeverity = (v: unknown): v is Severity => SEVERITIES.includes(v as Severity)
const isConfidence = (v: unknown): v is Confidence => typeof v === 'string' && v in CONFIDENCE_BARS

export function StatusChip({ alert }: { alert: Alert }) {
  const { t } = useI18n()
  const tone = alert.status === 'approved' || alert.status === 'executed' ? 'ok' : alert.status === 'rejected' ? 'cr' : alert.status === 'proposal' ? 'ac' : 'mu'
  return <span className={`detail-status detail-status--${tone}`}>{t.status[alert.status]}</span>
}

const AGENT_KEY: Record<string, 'watcher' | 'analyst' | 'strategist'> = {
  watcher: 'watcher',
  vigia: 'watcher',
  analyst: 'analyst',
  analista: 'analyst',
  strategist: 'strategist',
  estratega: 'strategist',
}

function AlertHero({ data, ctx }: BlockProps) {
  const { t } = useI18n()
  const d = data as HeroData
  const severity = d.severity?.value
  const sev = isSeverity(severity) ? severity : ctx.alert.severity
  const type = d.type?.value ? (t.alertType[d.type.value as keyof typeof t.alertType] ?? d.type.label) : undefined
  const entity = Object.entries(d.entity ?? {})
    .map(([k, v]) => (k === 'sku' ? `SKU ${v}` : v))
    .join(' · ')
  const confidence = d.confidence?.value
  return (
    <section className="detail-hero" aria-labelledby="detail-headline">
      <div className="detail-hero-text">
        <div className="card-meta">
          <span className={`chip-sev chip-sev--${sev}`}>
            <SeverityIcon severity={sev} />
            {t.hero.severity(t.severity[sev].toLowerCase())}
          </span>
          {type && <span className="card-type">{type}</span>}
          {entity && (
            <>
              <span aria-hidden="true">·</span>
              <span>{entity}</span>
            </>
          )}
          {d.confidence && (
            <ConfidenceChip bars={d.confidence.bars ?? 1} label={isConfidence(confidence) ? t.confidence[confidence] : (d.confidence.label ?? String(confidence))} />
          )}
        </div>
        <h1 id="detail-headline">{d.title ?? ctx.alert.headline}</h1>
        {d.agents && Object.keys(d.agents).length > 0 && (
          <ol className="detail-agents" aria-label={t.hero.agentsLabel}>
            {Object.entries(d.agents).map(([k, v], i) => (
              <li key={k}>
                {i > 0 && <span aria-hidden="true" className="detail-arrow">→</span>}
                <span className="detail-agent">
                  <CheckIcon />
                  {AGENT_KEY[k] ? t.agents[AGENT_KEY[k]] : k} {v.toLowerCase()}
                </span>
              </li>
            ))}
          </ol>
        )}
        <div className="detail-dates">
          {d.detected_at && <span>{t.hero.detected(d.detected_at.text)}</span>}
          <StatusChip alert={ctx.alert} />
          {d.updated_at && <span>{t.hero.updated(d.updated_at.text)}</span>}
        </div>
      </div>
      {d.amount_at_risk && (
        <div className="detail-risk">
          <div className="detail-label">{t.hero.atRiskPerMonth}</div>
          <div className="detail-risk-value" style={{ color: COLOR[d.severity?.color ?? ''] ?? 'var(--fg)' }}>
            {d.amount_at_risk.text}
          </div>
          {d.risk_note && <div className="detail-label">{d.risk_note}</div>}
        </div>
      )}
    </section>
  )
}

function KpiCard({ data }: BlockProps) {
  const { fmt } = useI18n()
  const d = data as KpiData
  const color = COLOR[d.tone?.color ?? '']
  return (
    <div className="detail-card detail-kpi">
      {d.label && <span className="detail-label">{d.label}</span>}
      <span className="detail-kpi-value">
        {d.value == null ? '—' : fmt.number(d.value)} {d.unit && <span className="detail-kpi-unit">{d.unit}</span>}
      </span>
      {d.note && (
        <span className="detail-kpi-note" style={color ? { color, fontWeight: 500 } : undefined}>
          {d.note}
        </span>
      )}
    </div>
  )
}

function PolicyRule({ data }: BlockProps) {
  const { t } = useI18n()
  const d = data as RuleData
  if (!d.text && !d.code && !d.situation) return null
  return (
    <div className="detail-card detail-rule">
      <div className="detail-row-between">
        <span className="detail-label detail-label--strong">{t.blocks.ruleBroken}</span>
        {d.code && <code className="detail-code">{d.code}</code>}
      </div>
      {d.text && <blockquote>{d.text}</blockquote>}
      {d.situation && <p className="detail-situation">{d.situation}</p>}
    </div>
  )
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function RelatedCauses({ items }: { items: CauseData[] }) {
  const { t } = useI18n()
  const causes = items.filter((c) => c.title || c.type || c.details || c.metric)
  if (!causes.length) return null
  return (
    <div className="detail-card detail-causes">
      <span className="detail-label detail-label--strong">{t.blocks.relatedCauses}</span>
      {causes.map((c, i) => {
        const sub = [c.type && capitalize(c.type), c.details].filter(Boolean).join(' · ')
        return (
          <div key={i} className="detail-cause">
            <div>
              {c.title && <span className="detail-cause-title">{c.title}</span>}
              {sub && <span className="detail-label">{sub}</span>}
            </div>
            {c.metric && <span className="detail-cause-metric">{c.metric}</span>}
          </div>
        )
      })}
    </div>
  )
}

const isMoneyText = (s: string) => /^\s*[$\d−+-]/.test(s)

function ProposedAction({ data, ctx }: BlockProps) {
  const { t, fmt } = useI18n()
  const d = data as ActionData
  const checked = !!ctx.selection[d.id]
  const id = `action-${d.id}`
  const confidence = d.confidence?.value
  const protectsNote = d.protects && !isMoneyText(d.protects.text) ? d.protects.text : null
  const protectsAmount = !d.protects ? null : protectsNote === null ? d.protects.text : d.protects.value > 0 ? fmt.money(d.protects.value) : null
  return (
    <div className={`detail-card detail-action${checked ? ' detail-action--checked' : ''}`}>
      <input type="checkbox" id={id} checked={checked} disabled={!ctx.canDecide} onChange={() => ctx.toggle(d.id)} />
      <div className="detail-action-body">
        <label htmlFor={id} className="detail-action-title">
          {d.title ?? t.blocks.action(d.id)}
        </label>
        {d.details && <p className="detail-muted">{d.details}</p>}
        {protectsNote && <p className="detail-muted">{t.blocks.protectsNote(protectsNote)}</p>}
        {ctx.editing && d.quantity != null && (
          <div className="detail-quantity">
            <label htmlFor={`qty-${d.id}`}>{d.quantity_label ?? t.blocks.quantity}</label>
            <input id={`qty-${d.id}`} type="number" min="0" value={ctx.quantities[d.id] ?? String(d.quantity)} onChange={(e) => ctx.setQuantity(d.id, e.target.value)} />
            <span className="detail-label">{t.blocks.recalculates}</span>
          </div>
        )}
        {d.assumptions && d.assumptions.length > 0 && (
          <div className="detail-assumptions">
            <strong>{t.blocks.assumptions}</strong>
            <ul>
              {d.assumptions.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {(protectsAmount || d.cost || d.confidence) && (
        <div className="detail-action-figures">
          {protectsAmount && (
            <>
              <span className="detail-action-protects">{protectsAmount}</span>
              <span className="detail-label">{t.blocks.protectsPerMonth}</span>
            </>
          )}
          {d.cost && <span className="detail-action-cost">{d.cost.value === 0 ? d.cost.text : `${d.cost_concept ?? t.blocks.cost}: ${d.cost.text}`}</span>}
          {d.confidence && (
            <ConfidenceChip bars={d.confidence.bars ?? 1} label={isConfidence(confidence) ? t.confidence[confidence] : (d.confidence.label ?? String(confidence))} />
          )}
        </div>
      )}
    </div>
  )
}

function DoubtNotice({ data }: BlockProps) {
  const { t } = useI18n()
  const d = data as DoubtData
  if (!d.text) return null
  return (
    <div className="detail-doubt">
      <span className="detail-doubt-icon">
        <SeverityIcon severity="medium" />
      </span>
      <span>
        <strong>{t.blocks.whereIDoubt}</strong> {d.text.charAt(0).toLowerCase() + d.text.slice(1)}
      </span>
    </div>
  )
}

const isNumeric = (v: string) => /^[−+-]?[\d.,]+\s*%?$/.test(v.trim())

function Evidence({ data, index }: BlockProps) {
  const { t } = useI18n()
  const d = data as EvidenceData
  const cols = d.table?.columns ?? []
  const rows = d.table?.rows ?? []
  const numeric = new Set(cols.filter((c) => rows.every((r) => isNumeric(String(r[c.key] ?? '')))).map((c) => c.key))
  const highlight = d.highlight ? d.highlight.toLowerCase() : null
  return (
    <article className="detail-card detail-evidence">
      <div className="detail-evidence-head">
        <span className="detail-label">{t.blocks.evidence(index + 1)}</span>
        {d.title && <h3>{d.title}</h3>}
        {d.description && <p className="detail-muted">{d.description}</p>}
      </div>
      {cols.length > 0 && (
        <div className="detail-table-wrap">
          <table className="detail-table">
            <thead>
              <tr>
                {cols.map((c) => (
                  <th key={c.key} scope="col" className={numeric.has(c.key) ? 'n' : undefined}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const strong = highlight !== null && String(r[cols[0].key] ?? '').toLowerCase().startsWith(highlight)
                return (
                  <tr key={i} className={strong ? 'highlighted' : undefined}>
                    {cols.map((c) => (
                      <td key={c.key} className={numeric.has(c.key) ? 'n' : undefined}>
                        {String(r[c.key] ?? '')}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </article>
  )
}

function CalculationNote({ data }: BlockProps) {
  const { t } = useI18n()
  const d = data as CalculationData
  if (!d.formula) return null
  return (
    <p className="detail-muted detail-calculation">
      {t.blocks.riskCalculation(d.formula.charAt(0).toLowerCase() + d.formula.slice(1))}
      {d.rule_version && ` ${t.blocks.ruleApplied(d.rule_version)}`}
    </p>
  )
}

const PROPOSAL_STATUSES = new Set(['proposal', 'propuesta'])

function Timeline({ data, ctx }: BlockProps) {
  const { t, fmt } = useI18n()
  const d = data as LogData
  const rows = (d.events?.rows ?? []).map((r) => ({ ...r, tone: PROPOSAL_STATUSES.has(r.status ?? '') ? 'ac' : 'mu' }))
  const dec = ctx.decision
  if (dec) {
    const at = new Date(dec.at)
    rows.push({
      date: `${fmt.date(at)}, ${fmt.time(at)}`,
      who: t.blocks.you,
      event:
        dec.type === 'approved'
          ? t.blocks.approvedEvent(dec.actions?.length ?? 0, dec.protects ? fmt.money(dec.protects) : null)
          : t.blocks.rejectedEvent(dec.reason ?? null, dec.details ?? null),
      status: dec.type,
      tone: dec.type === 'approved' ? 'ok' : 'cr',
    })
  }
  if (!rows.length) return null
  return (
    <ol className="detail-log">
      {rows.map((r, i) => (
        <li key={i}>
          <span className="detail-log-time">{r.date}</span>
          <span className="detail-log-line" aria-hidden="true">
            <span className={`detail-dot detail-dot--${r.tone}`} />
            <span className="detail-log-bar" />
          </span>
          <span className="detail-log-text">
            <strong>{r.who}</strong>
            <span>{r.event}</span>
          </span>
        </li>
      ))}
    </ol>
  )
}

interface Message {
  from: 'user' | 'assistant'
  text: string
}

function AlertChat({ data, ctx }: BlockProps) {
  const { t } = useI18n()
  const c = t.chat
  const d = (data ?? {}) as ChatData
  const [messages, setMessages] = useState<Message[]>([])
  const [question, setQuestion] = useState('')
  const send = (text: string) => {
    if (!text.trim()) return
    setMessages((m) => [...m, { from: 'user', text: text.trim() }, { from: 'assistant', text: c.simulatedReply }])
    setQuestion('')
  }
  return (
    <>
      <div className="detail-chat-head">
        <h2>{c.title}</h2>
        <span className="detail-label">{c.scope(ctx.alert.id)}</span>
      </div>
      <div className="detail-chat-log" role="log" aria-live="polite">
        {messages.length === 0 && <p className="detail-muted">{c.emptyHint}</p>}
        {messages.map((m, i) => (
          <div key={i} className={`detail-msg detail-msg--${m.from}`}>
            {m.from === 'assistant' && <span className="detail-label">Centinela</span>}
            {m.text}
          </div>
        ))}
      </div>
      <form
        className="detail-chat-foot"
        onSubmit={(e) => {
          e.preventDefault()
          send(question)
        }}
      >
        {d.suggested_questions && d.suggested_questions.length > 0 && (
          <div className="detail-suggestions">
            {d.suggested_questions.map((q) => (
              <button key={q} type="button" className="detail-suggestion" onClick={() => send(q)}>
                {q}
              </button>
            ))}
          </div>
        )}
        <label htmlFor="detail-question" className="detail-label">
          {c.yourQuestion}
        </label>
        <div className="detail-chat-input">
          <input id="detail-question" type="text" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder={c.placeholder} />
          <button type="submit" className="btn btn--primary" aria-label={c.send}>
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M2 8h11M9 3.5L13.5 8 9 12.5" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }} />
            </svg>
          </button>
        </div>
      </form>
    </>
  )
}

export const RENDERS: Record<string, (p: BlockProps) => ReactNode> = {
  AlertHero,
  KpiCard,
  LineChart: ({ data }) => <LineChart data={data as Parameters<typeof LineChart>[0]['data']} />,
  PolicyRule,
  ProposedAction,
  DoubtNotice,
  Evidence,
  CalculationNote,
  Timeline,
  AlertChat,
}

export const GROUPS: Record<string, (p: { items: unknown[]; ctx: Ctx }) => ReactNode> = {
  KpiCard: ({ items, ctx }) => (
    <div className="detail-kpis">
      {items.map((data, i) => (
        <KpiCard key={i} data={data} ctx={ctx} index={i} />
      ))}
    </div>
  ),
  RelatedCause: ({ items }) => <RelatedCauses items={items as CauseData[]} />,
}

export function UnknownBlock({ render, data }: { render: string; data: unknown }) {
  const { t } = useI18n()
  return (
    <div className="detail-card detail-unknown">
      <strong>{t.blocks.noTemplate(render)}</strong>
      <pre className="detail-sql">{JSON.stringify(data, null, 2)}</pre>
    </div>
  )
}
