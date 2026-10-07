import type { Alert } from './domain.ts'

export interface Money {
  value: number
  text: string
}

export interface DateValue {
  text: string
  iso: string | null
}

export interface EnumOption {
  value: string | null
  label?: string
  icon?: string
  color?: string
  bars?: number
}

export interface Table<R = Record<string, string | number | null | Money>> {
  columns: { key: string; label: string }[]
  rows: R[]
}

export interface Code {
  language: string | null
  code: string
}

export interface ViewComponent {
  component: string
  render: string
  zone: string
  order: number
  data: Record<string, unknown>
}

export interface ViewZone {
  id: string
  title: string | null
  collapsible?: boolean
  components: ViewComponent[]
}

export interface MdResult {
  ok: boolean
  errors: string[]
  warnings: string[]
  alert: Record<string, unknown>
  view: ViewZone[]
}

export interface Decision {
  type: 'approved' | 'rejected'
  at: string
  actions?: { id: string; quantity?: number }[]
  protects?: number
  reason?: string
  details?: string
}

export interface DetailResponse {
  alert: Alert
  ready: boolean
  source: 'file' | 'generated' | 'manual' | null
  markdown: string | null
  result: MdResult | null
  decision: Decision | null
}


export interface HeroData {
  summary?: string
  id?: string
  title?: string
  severity?: EnumOption
  type?: EnumOption
  status?: EnumOption
  confidence?: EnumOption
  amount_at_risk?: Money
  risk_note?: string
  entity?: Record<string, string>
  detected_at?: DateValue
  updated_at?: DateValue
  agents?: Record<string, string>
}

export interface KpiData {
  label?: string
  value?: number | null
  unit?: string
  note?: string
  tone?: EnumOption
}

export interface ChartData {
  title?: string
  unit?: string
  threshold?: number | null
  threshold_label?: string
  today?: string
  series?: Record<string, string>
  data?: Table<Record<string, string | number | null>>
  annotations?: string[]
}

export interface RuleData {
  text?: string
  code?: string
  situation?: string
}

export interface CauseData {
  details?: string
  type?: string
  title?: string
  metric?: string
}

export interface ActionData {
  details?: string
  id: string
  title?: string
  protects?: Money
  cost?: Money
  cost_concept?: string
  confidence?: EnumOption
  quantity?: number | null
  quantity_label?: string
  selected?: boolean
  assumptions?: string[]
}

export interface DoubtData {
  text?: string
}

export interface DecisionData {
  combinations?: Table<{ actions: string; protects?: Money }>
  rejection_reasons?: string[]
}

export interface EvidenceData {
  description?: string
  title?: string
  highlight?: string
  table?: Table<Record<string, string>>
  sql?: Code
}

export interface CalculationData {
  formula?: string
  rule_version?: string
}

export interface LogData {
  events?: Table<{ date: string; who: string; event: string; status?: string }>
}

export interface ChatData {
  suggested_questions?: string[]
}
