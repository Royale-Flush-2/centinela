export const LANGS = ['es', 'en'] as const
export type Lang = (typeof LANGS)[number]

export const SEVERITIES = ['critical', 'high', 'medium', 'low'] as const
export type Severity = (typeof SEVERITIES)[number]

export const STATUSES = ['new', 'analyzing', 'proposal', 'approved', 'rejected', 'executed'] as const
export type Status = (typeof STATUSES)[number]

export const TOPICS = ['inventory', 'receivables', 'margin', 'returns', 'sales'] as const
export type Topic = (typeof TOPICS)[number]

export type Confidence = 'high' | 'medium' | 'low'
export const CONFIDENCE_BARS: Record<Confidence, number> = { high: 3, medium: 2, low: 1 }
export type SortOrder = 'amount' | 'severity' | 'recent' | 'relevance'

export const PENDING_STATUSES: readonly Status[] = ['new', 'analyzing', 'proposal']

export const VIEWS = ['pending', 'approved', 'rejected', 'executed', 'all'] as const
export type View = (typeof VIEWS)[number]

export const VIEW_STATUSES: Record<View, readonly Status[]> = {
  pending: PENDING_STATUSES,
  approved: ['approved'],
  rejected: ['rejected'],
  executed: ['executed'],
  all: STATUSES,
}

export const FILTER_KEYS = ['topic', 'status', 'priority'] as const
export type FilterKey = (typeof FILTER_KEYS)[number]

export type Operator = 'is' | 'is_not'

export interface FieldFilter<T extends string> {
  values: T[]
  op: Operator
}

export interface AlertQuery {
  view: View
  q: string
  topic: FieldFilter<Topic>
  status: FieldFilter<Status>
  priority: FieldFilter<Severity>
  sort: SortOrder
}

export interface Series {
  label: string
  unit: '' | '%' | 'days'
  values: number[]
  threshold: number
  thresholdType: 'min' | 'max'
  summary: string
}

export interface Alert {
  id: string
  severity: Severity
  confidence: Confidence
  status: Status
  topic: Topic
  typeLabel: string
  entityLabel: string
  headline: string
  description: string
  amountAtRisk: number
  createdAt: string
  agent: string | null
  series: Series
}

export interface AlertResult extends Alert {
  relevance?: number
  matches?: string[]
}

export interface Facet<T extends string = string> {
  value: T
  count: number
}

export interface AlertsResponse {
  alerts: AlertResult[]
  total: number
  viewTotal: number
  facets: {
    topic: Facet<Topic>[]
    status: Facet<Status>[]
    priority: Facet<Severity>[]
  }
}

export interface Summary {
  amountAtRisk: number
  bySeverity: Record<Severity, number>
  pending: number
  ready: number
  inProgress: number
  lastCheck: string
}

export interface AlertEvent {
  seq: number
  type: 'new' | 'ready'
  alert: Alert
  at: string
}

export interface EventsResponse {
  events: AlertEvent[]
  last: number
  revision: number
}
