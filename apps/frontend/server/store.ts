import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { Decision, DetailResponse } from '../src/detail.ts'
import {
  PENDING_STATUSES,
  SEVERITIES,
  TOPICS,
  VIEW_STATUSES,
  type Alert,
  type AlertQuery,
  type AlertResult,
  type AlertsResponse,
  type EventsResponse,
  type Facet,
  type FilterKey,
  type Lang,
  type Severity,
  type SortOrder,
  type Status,
  type Summary,
} from '../src/domain.ts'
import { decodeEscapes, extractAgentMarkdown, parse, type CentinelaConfig } from './centinelaMd.ts'
import { INITIAL_ALERTS, TEMPLATES, localize, type AlertRecord, type Localized } from './data.ts'
import { generateMarkdown } from './markdownGenerator.ts'
import { RELEVANCE_THRESHOLD, score } from './semantic.ts'

const AGENT_DIR = fileURLToPath(new URL('./agent/', import.meta.url))
const readConfig = (): CentinelaConfig => JSON.parse(readFileSync(`${AGENT_DIR}centinela.config.json`, 'utf8'))

export interface DecisionRequest {
  actions?: { id: string; quantity?: number }[]
  protects?: number
  reason?: string
  details?: string
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

const MESSAGES = {
  es: {
    notFound: (id: string) => `No existe la alerta ${id}`,
    notDecidable: (status: Status) => `La alerta está "${STATUS_LABEL.es[status]}" y no tiene una propuesta para decidir`,
    pickAction: 'Marca al menos una acción para aprobar',
    idMismatch: (mdId: string, id: string) => `El Markdown dice "## id: ${mdId}" pero se pidió la alerta ${id}.`,
  },
  en: {
    notFound: (id: string) => `Alert ${id} does not exist`,
    notDecidable: (status: Status) => `The alert is "${STATUS_LABEL.en[status]}" and has no proposal to decide`,
    pickAction: 'Check at least one action to approve',
    idMismatch: (mdId: string, id: string) => `The Markdown says "## id: ${mdId}" but alert ${id} was requested.`,
  },
}

const STATUS_LABEL: Record<Lang, Record<Status, string>> = {
  es: { new: 'Nueva', analyzing: 'En análisis', proposal: 'Propuesta lista', approved: 'Aprobada', rejected: 'Rechazada', executed: 'Ejecutada' },
  en: { new: 'New', analyzing: 'Analyzing', proposal: 'Proposal ready', approved: 'Approved', rejected: 'Rejected', executed: 'Executed' },
}

const SEVERITY_WEIGHT: Record<Severity, number> = { critical: 4, high: 3, medium: 2, low: 1 }

const STEPS: { afterMs: number; status: Status; agent: ((focus: Localized) => Localized) | null }[] = [
  { afterMs: 0, status: 'new', agent: () => ({ es: 'En cola para el Analista', en: 'Queued for the Analyst' }) },
  { afterMs: 5_000, status: 'analyzing', agent: (f) => ({ es: `Analista revisando ${f.es} · paso 1 de 3`, en: `Analyst reviewing ${f.en} · step 1 of 3` }) },
  { afterMs: 10_000, status: 'analyzing', agent: () => ({ es: 'Analista cruzando datos con las políticas · paso 2 de 3', en: 'Analyst checking data against the policies · step 2 of 3' }) },
  { afterMs: 16_000, status: 'analyzing', agent: () => ({ es: 'Estratega preparando la propuesta · paso 3 de 3', en: 'Strategist preparing the proposal · step 3 of 3' }) },
  { afterMs: 22_000, status: 'proposal', agent: null },
]

interface Simulation {
  start: number
  step: number
  focus: Localized
}

interface StoredEvent {
  seq: number
  type: 'new' | 'ready'
  alert: AlertRecord
  at: string
}

const field = (a: AlertRecord, k: FilterKey): string => (k === 'priority' ? a.severity : a[k])

export function createStore() {
  const alerts: AlertRecord[] = structuredClone(INITIAL_ALERTS)
  const simulations = new Map<string, Simulation>()
  const events: StoredEvent[] = []
  let eventSeq = 0
  let alertSeq = 100
  let revision = 1
  const manualMarkdowns = new Map<string, { markdown: string; lang: Lang }>()
  const decisions = new Map<string, Decision>()

  function find(id: string, lang: Lang) {
    const alert = alerts.find((a) => a.id === id)
    if (!alert) throw new ApiError(404, MESSAGES[lang].notFound(id))
    return alert
  }

  function agentFile(id: string, lang: Lang): { markdown: string; lang: Lang } | null {
    if (!/^[A-Za-z0-9-]+$/.test(id)) return null
    const other: Lang = lang === 'es' ? 'en' : 'es'
    for (const l of [lang, other]) {
      const path = `${AGENT_DIR}alerts/${id}.${l}.md`
      if (existsSync(path)) return { markdown: readFileSync(path, 'utf8'), lang: l }
    }
    return null
  }

  function markdownSource(alert: AlertRecord, lang: Lang): { markdown: string; lang: Lang; source: DetailResponse['source'] } | null {
    const manual = manualMarkdowns.get(alert.id)
    if (manual !== undefined) return { ...manual, source: 'manual' }
    if (alert.status === 'new' || alert.status === 'analyzing') return null
    const file = agentFile(alert.id, lang)
    if (file) return { ...file, source: 'file' }
    return { markdown: generateMarkdown(alert, lang), lang, source: 'generated' }
  }

  function buildDetail(alert: AlertRecord, lang: Lang): DetailResponse {
    const src = markdownSource(alert, lang)
    const result = src ? parse(src.markdown, readConfig(), lang, src.lang) : null
    const mdId = result?.alert.id
    if (result && mdId && mdId !== alert.id) result.warnings.push(MESSAGES[lang].idMismatch(String(mdId), alert.id))
    return {
      alert: localize(alert, lang),
      ready: src !== null,
      source: src?.source ?? null,
      markdown: src?.markdown ?? null,
      result,
      decision: decisions.get(alert.id) ?? null,
    }
  }

  function record(type: StoredEvent['type'], alert: AlertRecord) {
    events.push({ seq: ++eventSeq, type, alert: structuredClone(alert), at: new Date().toISOString() })
    if (events.length > 200) events.shift()
  }

  function advance() {
    const now = Date.now()
    for (const [id, sim] of simulations) {
      const alert = alerts.find((a) => a.id === id)
      if (!alert || !PENDING_STATUSES.includes(alert.status)) {
        simulations.delete(id)
        continue
      }
      let step = sim.step
      while (step + 1 < STEPS.length && now - sim.start >= STEPS[step + 1].afterMs) step++
      if (step === sim.step) continue
      sim.step = step
      alert.status = STEPS[step].status
      alert.agent = STEPS[step].agent?.(sim.focus) ?? null
      revision++
      if (step === STEPS.length - 1) {
        record('ready', alert)
        simulations.delete(id)
      }
    }
  }

  function matchesFilters(a: AlertRecord, q: AlertQuery, except?: FilterKey) {
    return (['topic', 'status', 'priority'] as const).every((k) => {
      const f = q[k]
      if (k === except || f.values.length === 0) return true
      const inside = (f.values as string[]).includes(field(a, k))
      return f.op === 'is' ? inside : !inside
    })
  }

  function facets<T extends string>(base: AlertRecord[], q: AlertQuery, key: FilterKey, values: readonly T[]): Facet<T>[] {
    const visible = base.filter((a) => matchesFilters(a, q, key))
    return values.map((value) => ({ value, count: visible.filter((a) => field(a, key) === value).length }))
  }

  function sortList(list: AlertResult[], sort: SortOrder) {
    const byAmount = (a: AlertResult, b: AlertResult) => b.amountAtRisk - a.amountAtRisk
    const comparators: Record<SortOrder, (a: AlertResult, b: AlertResult) => number> = {
      amount: byAmount,
      severity: (a, b) => SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity] || byAmount(a, b),
      recent: (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
      relevance: (a, b) => (b.relevance ?? 0) - (a.relevance ?? 0) || byAmount(a, b),
    }
    return list.sort(comparators[sort])
  }

  return {
    list(q: AlertQuery, lang: Lang): AlertsResponse {
      advance()
      const inView = alerts.filter((a) => VIEW_STATUSES[q.view].includes(a.status))
      const searching = q.q.trim() !== ''
      const scores = new Map<string, { score: number; matches: string[] }>()
      if (searching) inView.forEach((a) => scores.set(a.id, score(q.q, a, lang)))
      const base = searching ? inView.filter((a) => (scores.get(a.id)?.score ?? 0) >= RELEVANCE_THRESHOLD) : inView
      const results: AlertResult[] = base
        .filter((a) => matchesFilters(a, q))
        .map((a) => (searching ? { ...localize(a, lang), relevance: scores.get(a.id)!.score, matches: scores.get(a.id)!.matches } : localize(a, lang)))
      const sorted = sortList(results, searching ? q.sort : q.sort === 'relevance' ? 'amount' : q.sort)
      return {
        alerts: sorted,
        total: sorted.length,
        viewTotal: inView.length,
        facets: {
          topic: facets(base, q, 'topic', TOPICS),
          status: facets(base, q, 'status', VIEW_STATUSES[q.view]),
          priority: facets(base, q, 'priority', SEVERITIES),
        },
      }
    },

    summary(): Summary {
      advance()
      const pending = alerts.filter((a) => PENDING_STATUSES.includes(a.status))
      const bySeverity = Object.fromEntries(SEVERITIES.map((s) => [s, pending.filter((a) => a.severity === s).length])) as Record<Severity, number>
      return {
        amountAtRisk: pending.reduce((s, a) => s + a.amountAtRisk, 0),
        bySeverity,
        pending: pending.length,
        ready: pending.filter((a) => a.status === 'proposal').length,
        inProgress: pending.filter((a) => a.status !== 'proposal').length,
        lastCheck: new Date().toISOString(),
      }
    },

    simulate(lang: Lang, severity?: Severity): Alert {
      const candidates = severity ? TEMPLATES.filter((p) => p.severity === severity) : TEMPLATES
      const { focus, ...template } = candidates[Math.floor(Math.random() * candidates.length)]
      const now = new Date()
      const mmdd = String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0')
      const variation = 0.85 + Math.random() * 0.3
      const alert: AlertRecord = {
        ...structuredClone(template),
        id: `ALR-${mmdd}-${++alertSeq}`,
        status: 'new',
        agent: STEPS[0].agent?.(focus) ?? null,
        amountAtRisk: Math.round((template.amountAtRisk * variation) / 100_000) * 100_000,
        createdAt: now.toISOString(),
      }
      alerts.push(alert)
      simulations.set(alert.id, { start: Date.now(), step: 0, focus })
      revision++
      record('new', alert)
      return localize(alert, lang)
    },

    decide(id: string, action: 'approve' | 'reject', req: DecisionRequest, lang: Lang): Alert {
      const alert = find(id, lang)
      if (alert.status !== 'proposal') throw new ApiError(409, MESSAGES[lang].notDecidable(alert.status))
      if (action === 'approve' && req.actions && req.actions.length === 0) throw new ApiError(400, MESSAGES[lang].pickAction)
      alert.status = action === 'approve' ? 'approved' : 'rejected'
      alert.agent = null
      decisions.set(id, {
        type: alert.status,
        at: new Date().toISOString(),
        ...(action === 'approve' ? { actions: req.actions, protects: req.protects } : { reason: req.reason, details: req.details }),
      })
      revision++
      return localize(alert, lang)
    },

    detail(id: string, lang: Lang): DetailResponse {
      advance()
      return buildDetail(find(id, lang), lang)
    },

    publishMarkdown(id: string, body: string, lang: Lang): { detail: DetailResponse; accepted: boolean } {
      const markdown = decodeEscapes(extractAgentMarkdown(body))
      const alert = find(id, lang)
      const result = parse(markdown, readConfig(), lang)
      if (!result.ok) return { accepted: false, detail: { ...buildDetail(alert, lang), markdown, result, source: 'manual' } }
      manualMarkdowns.set(id, { markdown, lang })
      revision++
      return { accepted: true, detail: buildDetail(alert, lang) }
    },

    discardMarkdown(id: string, lang: Lang): DetailResponse {
      const alert = find(id, lang)
      if (manualMarkdowns.delete(id)) revision++
      return buildDetail(alert, lang)
    },

    events(since: number | null, lang: Lang): EventsResponse {
      advance()
      return {
        events: since === null ? [] : events.filter((e) => e.seq > since).map((e) => ({ ...e, alert: localize(e.alert, lang) })),
        last: eventSeq,
        revision,
      }
    },
  }
}
