import type { DetailResponse } from './detail.ts'
import { FILTER_KEYS, type Alert, type AlertQuery, type AlertsResponse, type EventsResponse, type Lang, type Severity, type Summary } from './domain.ts'

export type Filters = AlertQuery

let language: Lang = 'es'
export const setApiLanguage = (lang: Lang) => {
  language = lang
}

const withLanguage = (init: RequestInit = {}): RequestInit => ({
  ...init,
  headers: { 'Accept-Language': language, ...(init.headers as Record<string, string> | undefined) },
})

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, withLanguage(init))
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `Error ${res.status}`)
  return body as T
}

export function fetchAlerts(f: Filters, signal?: AbortSignal) {
  const p = new URLSearchParams({ view: f.view })
  if (f.q.trim()) p.set('q', f.q.trim())
  for (const k of FILTER_KEYS) {
    if (!f[k].values.length) continue
    p.set(k, f[k].values.join(','))
    if (f[k].op === 'is_not') p.set(`${k}_op`, 'is_not')
  }
  p.set('sort', f.sort)
  return request<AlertsResponse>(`/api/alerts?${p}`, { signal })
}

export const fetchSummary = (signal?: AbortSignal) => request<Summary>('/api/summary', { signal })

export function fetchEvents(since: number | null) {
  return request<EventsResponse>(since === null ? '/api/events' : `/api/events?since=${since}`)
}

export function simulateAlert(severity?: Severity) {
  return request<Alert>('/api/alerts/simulate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(severity ? { severity } : {}),
  })
}

export interface DecisionBody {
  actions?: { id: string; quantity?: number }[]
  protects?: number
  reason?: string
  details?: string
}

export function decide(id: string, action: 'approve' | 'reject', body: DecisionBody = {}) {
  return request<Alert>(`/api/alerts/${encodeURIComponent(id)}/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const detailPath = (id: string) => `/api/alerts/${encodeURIComponent(id)}/detail`

export const fetchDetail = (id: string, signal?: AbortSignal) => request<DetailResponse>(detailPath(id), { signal })

export async function publishMarkdown(id: string, markdown: string) {
  const res = await fetch(detailPath(id), withLanguage({ method: 'PUT', headers: { 'Content-Type': 'text/markdown; charset=utf-8' }, body: markdown }))
  const body = await res.json().catch(() => ({}))
  if (res.status !== 200 && res.status !== 422) throw new Error((body as { error?: string }).error ?? `Error ${res.status}`)
  return { accepted: res.status === 200, detail: body as DetailResponse }
}

export const discardMarkdown = (id: string) => request<DetailResponse>(detailPath(id), { method: 'DELETE' })
