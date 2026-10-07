import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react'
import { decide, fetchDetail } from '../../api.ts'
import type { ActionData, DecisionData, DetailResponse, HeroData, ViewComponent, ViewZone } from '../../detail.ts'
import type { Alert } from '../../domain.ts'
import { useI18n } from '../../i18n/context.ts'
import type { Toast } from '../Toasts.tsx'
import { GROUPS, RENDERS, StatusChip, UnknownBlock, type Ctx } from './blocks.tsx'
import { DecisionBar } from './DecisionBar.tsx'
import { FloatingChat } from './FloatingChat.tsx'
import { InPreparation } from './InPreparation.tsx'
import { MarkdownPanel } from './MarkdownPanel.tsx'
import '../../detail.css'

interface Props {
  id: string
  version: number
  notify: (toast: Omit<Toast, 'id'>) => void
  onChange: () => void
}

function group(components: ViewComponent[]) {
  const groups: { render: string; items: ViewComponent[] }[] = []
  for (const c of components) {
    const last = groups[groups.length - 1]
    if (last && last.render === c.render) last.items.push(c)
    else groups.push({ render: c.render, items: [c] })
  }
  return groups
}

function Zone({ zone, ctx, hero, rules = 0 }: { zone: ViewZone; ctx: Ctx; hero?: HeroData; rules?: number }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const title = t.detail.zones[zone.id as keyof typeof t.detail.zones] ?? zone.title
  const body = (
    <>
      {zone.id === 'what_happened' && hero?.summary && <WhatHappenedSummary text={hero.summary} />}
      {zone.id === 'proposal' && ctx.canDecide && <span className="detail-label detail-hint">{t.detail.pickActions}</span>}
      {group(zone.components).map((g, gi) => {
        const Group = GROUPS[g.render]
        if (Group) return <Group key={gi} items={g.items.map((c) => c.data)} ctx={ctx} />
        const Render = RENDERS[g.render]
        return (
          <Fragment key={gi}>
            {g.items.map((c, i) => (Render ? <Render key={i} data={c.data} ctx={ctx} index={i} /> : <UnknownBlock key={i} render={c.render} data={c.data} />))}
          </Fragment>
        )
      })}
    </>
  )

  if (zone.id === 'header') return body
  if (zone.collapsible) {
    const evidence = zone.components.filter((c) => c.component === 'evidence').length
    return (
      <section className="detail-zone" aria-labelledby={`z-${zone.id}`}>
        <h2 id={`z-${zone.id}`} className="detail-collapsible-h">
          <button type="button" className="detail-collapsible" aria-expanded={open} aria-controls={`zc-${zone.id}`} onClick={() => setOpen((v) => !v)}>
            <span>
              <span className="detail-collapsible-title">{title}</span>
              <span className="detail-label">{t.detail.collapsibleSummary(evidence, rules)}</span>
            </span>
            <span className="detail-label">{open ? t.common.hide : t.common.show}</span>
          </button>
        </h2>
        {open && (
          <div id={`zc-${zone.id}`} className="detail-zone-body">
            {body}
          </div>
        )}
      </section>
    )
  }
  return (
    <section className={`detail-zone detail-zone--${zone.id}`} aria-labelledby={`z-${zone.id}`}>
      <h2 id={`z-${zone.id}`} className="detail-zone-title">
        {title}
      </h2>
      {zone.id === 'why' ? <WhyZone groups={body} /> : body}
    </section>
  )
}

const WhyZone = ({ groups }: { groups: ReactNode }) => <div className="detail-why">{groups}</div>

function WhatHappenedSummary({ text }: { text: string }) {
  const cut = text.indexOf('. ')
  if (cut < 0) return <p className="detail-summary">{text}</p>
  return (
    <p className="detail-summary">
      <strong>{text.slice(0, cut + 1)}</strong> {text.slice(cut + 2)}
    </p>
  )
}

const dataOf = <T,>(zones: ViewZone[], component: string) =>
  zones.flatMap((z) => z.components).filter((c) => c.component === component).map((c) => c.data as T)

export function AlertDetail({ id, version, notify, onChange }: Props) {
  const { t, fmt } = useI18n()
  const [resp, setResp] = useState<DetailResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selection, setSelection] = useState<Record<string, boolean>>({})
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [mode, setMode] = useState<'base' | 'edit' | 'reject'>('base')
  const [sending, setSending] = useState(false)
  const [baseMarkdown, setBaseMarkdown] = useState<string | null>(null)

  useEffect(() => {
    const ctrl = new AbortController()
    fetchDetail(id, ctrl.signal)
      .then((r) => {
        setResp(r)
        setError(null)
      })
      .catch((e: unknown) => {
        if (!ctrl.signal.aborted) setError(e instanceof Error ? e.message : t.detail.loadFailed)
      })
    return () => ctrl.abort()
  }, [id, version, t])

  const zones = useMemo(() => (resp?.result?.ok ? resp.result.view : []), [resp])
  const actions = useMemo(() => dataOf<ActionData>(zones, 'action'), [zones])

  if (resp?.markdown !== undefined && resp.markdown !== baseMarkdown) {
    setBaseMarkdown(resp.markdown)
    setSelection(Object.fromEntries(actions.map((a) => [a.id, a.selected !== false])))
    setQuantities({})
    setMode('base')
  }

  if (error) {
    return (
      <main className="content">
        <div className="empty" role="alert">
          <h2>{t.detail.errorTitle}</h2>
          <p>{error}</p>
          <a className="btn" href="#/">
            {t.detail.backToInbox}
          </a>
        </div>
      </main>
    )
  }
  if (!resp) {
    return (
      <main className="content" aria-busy="true">
        <div className="card card--skeleton" style={{ height: 220 }} />
        <div className="card card--skeleton" style={{ height: 320 }} />
      </main>
    )
  }

  const alert: Alert = resp.alert
  const panel = <MarkdownPanel id={id} detail={resp} onDetail={setResp} notify={notify} onChange={onChange} />

  if (!resp.ready) {
    return (
      <main className="content detail-content">
        <InPreparation alert={alert} />
        {panel}
      </main>
    )
  }

  if (!resp.result?.ok) {
    return (
      <main className="content detail-content">
        <div className="detail-card detail-error" role="alert">
          <span className="chip-sev chip-sev--critical">{t.detail.invalid.chip}</span>
          <h2>{t.detail.invalid.title}</h2>
          <p className="detail-muted">{t.detail.invalid.text}</p>
          <ul>
            {resp.result?.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
        {panel}
      </main>
    )
  }

  const hero = dataOf<HeroData>(zones, 'hero')[0]
  const decisionData = dataOf<DecisionData>(zones, 'decision')[0]
  const chat = zones.find((z) => z.id === 'chat')
  const canDecide = alert.status === 'proposal'

  const ctx: Ctx = {
    alert,
    canDecide,
    editing: mode === 'edit',
    selection,
    toggle: (aid) => setSelection((s) => ({ ...s, [aid]: !s[aid] })),
    quantities,
    setQuantity: (aid, v) => setQuantities((q) => ({ ...q, [aid]: v })),
    decision: resp.decision,
  }

  async function approve(protects: number) {
    const chosen = actions.filter((a) => selection[a.id])
    setSending(true)
    try {
      await decide(id, 'approve', {
        actions: chosen.map((a) => ({ id: a.id, quantity: quantities[a.id] !== undefined ? Number(quantities[a.id]) : (a.quantity ?? undefined) })),
        protects,
      })
      notify({ tone: 'ok', title: t.detail.approvedToast(chosen.length), text: t.detail.approvedToastText(fmt.money(protects), alert.headline) })
      setMode('base')
      onChange()
    } catch (e) {
      notify({ tone: 'error', title: t.detail.approveFailed, text: e instanceof Error ? e.message : '' })
    } finally {
      setSending(false)
    }
  }

  async function reject(reason: string, details: string) {
    setSending(true)
    try {
      await decide(id, 'reject', { reason, details: details.trim() || undefined })
      notify({ tone: 'ok', title: t.detail.rejectedToast, text: t.detail.reasonText(reason) })
      setMode('base')
      onChange()
    } catch (e) {
      notify({ tone: 'error', title: t.detail.rejectFailed, text: e instanceof Error ? e.message : '' })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="detail">
      <div className="detail-main">
        <div className="detail-column">
          {zones
            .filter((z) => z.id !== 'decision' && z.id !== 'chat')
            .map((z) => (
              <Zone key={z.id} zone={z} ctx={ctx} hero={hero} rules={dataOf(zones, 'rule').length} />
            ))}
          {!hero && (
            <div className="detail-hero-min">
              <h1>{alert.headline}</h1>
              <StatusChip alert={alert} /> <span className="detail-label">{t.common.since(fmt.date(alert.createdAt))}</span>
            </div>
          )}
          {panel}
        </div>
        <div className="detail-dock">
          {chat && (
            <FloatingChat>
              {chat.components.map((c, i) => {
                const Render = RENDERS[c.render]
                return Render ? <Render key={i} data={c.data} ctx={ctx} index={i} /> : <UnknownBlock key={i} render={c.render} data={c.data} />
              })}
            </FloatingChat>
          )}
          {decisionData && (
            <DecisionBar
              data={decisionData}
              actions={actions}
              selection={selection}
              amountAtRisk={hero?.amount_at_risk?.value ?? alert.amountAtRisk}
              alert={alert}
              decision={resp.decision}
              mode={mode}
              setMode={setMode}
              sending={sending}
              onApprove={approve}
              onReject={reject}
            />
          )}
        </div>
      </div>
    </div>
  )
}
