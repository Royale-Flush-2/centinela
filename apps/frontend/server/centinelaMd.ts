import type { Lang } from '../src/domain.ts'
import type { MdResult, ViewComponent, ViewZone } from '../src/detail.ts'

type Value = any

export interface SlotDef {
  type: string
  required?: boolean
  field?: string
  alias?: string[]
  options?: Record<string, Record<string, unknown> & { alias?: string[] }>
  default?: unknown
  numeric_columns?: string[]
  money_columns?: string[]
  column_aliases?: Record<string, string>
  x_axis?: string
  max?: number
  numeric_thresholds?: Record<string, number>
}

export interface ComponentDef {
  render: string
  zone: string
  order: number
  required?: boolean
  repeatable?: boolean
  min?: number
  max?: number
  collection?: string
  default_slot?: string
  alias?: string[]
  bullet_list?: 'kpis' | 'table'
  slots: Record<string, SlotDef>
}

export interface CentinelaConfig {
  zones?: { id: string; title: string | null; collapsible?: boolean }[]
  components: Record<string, ComponentDef>
}

const MESSAGES = {
  es: {
    unknownComponent: (line: number, name: string) => `Línea ${line}: el componente "# ${name}" no existe en la config.`,
    looseTextIgnored: (name: string, line: number) => `"# ${name}" (línea ${line}) tiene texto suelto pero no define default_slot; se ignoró.`,
    unknownSlot: (line: number, name: string, slot: string) => `Línea ${line}: "# ${name}" no tiene el slot "## ${slot}".`,
    invalidOption: (line: number, text: string, slot: string, name: string) => `Línea ${line}: "${text}" no es una opción válida de "${slot}" en "# ${name}".`,
    invalidNumber: (line: number, text: string, slot: string, name: string) => `Línea ${line}: "${text}" no es un número válido para "${slot}" en "# ${name}".`,
    tooLong: (line: number, slot: string, length: number, max: number) => `Línea ${line}: "${slot}" tiene ${length} caracteres (máximo recomendado ${max}).`,
    tooMany: (line: number, slot: string, count: number, max: number) => `Línea ${line}: "${slot}" tiene ${count} elementos (máximo ${max}).`,
    missingSlot: (line: number, name: string, slot: string) => `Línea ${line}: a "# ${name}" le falta el slot obligatorio "## ${slot}".`,
    missingComponent: (name: string) => `Falta el componente obligatorio "# ${name}".`,
    repeated: (name: string, n: number) => `"# ${name}" aparece ${n} veces y solo se permite una.`,
    belowMin: (name: string, min: number, n: number) => `"# ${name}" necesita al menos ${min} (hay ${n}).`,
    aboveMax: (name: string, max: number, n: number) => `"# ${name}" admite máximo ${max} (hay ${n}).`,
  },
  en: {
    unknownComponent: (line: number, name: string) => `Line ${line}: the component "# ${name}" does not exist in the config.`,
    looseTextIgnored: (name: string, line: number) => `"# ${name}" (line ${line}) has loose text but defines no default_slot; it was ignored.`,
    unknownSlot: (line: number, name: string, slot: string) => `Line ${line}: "# ${name}" has no slot "## ${slot}".`,
    invalidOption: (line: number, text: string, slot: string, name: string) => `Line ${line}: "${text}" is not a valid option of "${slot}" in "# ${name}".`,
    invalidNumber: (line: number, text: string, slot: string, name: string) => `Line ${line}: "${text}" is not a valid number for "${slot}" in "# ${name}".`,
    tooLong: (line: number, slot: string, length: number, max: number) => `Line ${line}: "${slot}" has ${length} characters (recommended maximum ${max}).`,
    tooMany: (line: number, slot: string, count: number, max: number) => `Line ${line}: "${slot}" has ${count} items (maximum ${max}).`,
    missingSlot: (line: number, name: string, slot: string) => `Line ${line}: "# ${name}" is missing the required slot "## ${slot}".`,
    missingComponent: (name: string) => `The required component "# ${name}" is missing.`,
    repeated: (name: string, n: number) => `"# ${name}" appears ${n} times and only one is allowed.`,
    belowMin: (name: string, min: number, n: number) => `"# ${name}" needs at least ${min} (there are ${n}).`,
    aboveMax: (name: string, max: number, n: number) => `"# ${name}" allows at most ${max} (there are ${n}).`,
  },
} satisfies Record<Lang, unknown>

export const norm = (s: string) =>
  String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

function decimalSeparator(raw: string): ',' | '.' | null {
  const lastComma = raw.lastIndexOf(',')
  const lastDot = raw.lastIndexOf('.')
  if (lastComma >= 0 && lastDot >= 0) return lastComma > lastDot ? ',' : '.'
  if (lastComma < 0 && lastDot < 0) return null
  const sep = lastComma >= 0 ? ',' : '.'
  const repeated = raw.split(sep).length > 2
  const digitsAfter = raw.length - raw.lastIndexOf(sep) - 1
  const leadingZero = /^-?0[.,]/.test(raw)
  return repeated || (digitsAfter === 3 && !leadingZero) ? null : sep
}

const parseNumber = (s: string): number | null => {
  const m = String(s).replace(/−/g, '-').match(/-?\d[\d.,]*/)
  if (!m) return null
  const raw = m[0].replace(/[.,]+$/, '')
  const decimal = decimalSeparator(raw)
  const integer = decimal ? raw.slice(0, raw.lastIndexOf(decimal)) : raw
  const fraction = decimal ? raw.slice(raw.lastIndexOf(decimal) + 1) : ''
  const n = parseFloat(integer.replace(/[.,]/g, '') + (fraction ? `.${fraction}` : ''))
  return Number.isNaN(n) ? null : n
}

const MONTHS: Record<string, number> = {
  ene: 1, jan: 1, feb: 2, mar: 3, abr: 4, apr: 4, may: 5, jun: 6, jul: 7, ago: 8, aug: 8, sep: 9, oct: 10, nov: 11, dic: 12, dec: 12,
}

function setPath(obj: Record<string, Value>, path: string, val: Value) {
  const parts = path.split('.')
  let o = obj
  for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]] = o[parts[i]] || {}
  o[parts[parts.length - 1]] = val
}

const money = (v: string) => {
  const text = v.trim()
  const n = parseNumber(text)
  if (n === null) return { value: 0, text }
  let mult = 1
  if (/mil\s+millones|\bmm\b|billion|\d\s*B\b/i.test(text)) mult = 1e9
  else if (/\d\s*M\b|millones?|millions?/.test(text)) mult = 1e6
  else if (/\bmil\b|thousand|\d\s*[kK]\b/i.test(text)) mult = 1e3
  return { value: Math.round(n * mult), text }
}

const list = (v: string) =>
  v
    .split('\n')
    .map((l) => l.match(/^\s*[-*]\s+(.*)$/))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => m[1].trim())

export const TYPES: Record<string, (v: string, def: SlotDef) => Value> = {
  text: (v) => v.replace(/\s+/g, ' ').trim(),
  paragraph: (v) => v.trim(),
  number: (v) => parseNumber(v),
  boolean: (v) => /^(si|yes|true|1|x)$/.test(norm(v)),
  money: (v) => money(v),

  date: (v) => {
    const text = v.trim()
    const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/)
    if (iso) return { text, iso: `${iso[1]}-${iso[2]}-${iso[3]}` + (iso[4] ? `T${iso[4]}:${iso[5]}:00-05:00` : '') }
    const n = norm(text)
    const es = n.match(/^(\d{1,2})_([a-z]{3})[a-z]*_(\d{4})(?:_(\d{1,2})_(\d{2})_?([ap])?)?/)
    const en = n.match(/^([a-z]{3})[a-z]*_(\d{1,2})_(\d{4})(?:_(\d{1,2})_(\d{2})_?([ap])?)?/)
    const parts = es ? { day: es[1], month: es[2], year: es[3], h: es[4], min: es[5], ap: es[6] } : en ? { day: en[2], month: en[1], year: en[3], h: en[4], min: en[5], ap: en[6] } : null
    if (!parts || !MONTHS[parts.month]) return { text, iso: null }
    let h = parts.h ? parseInt(parts.h, 10) : 0
    if (parts.ap === 'p' && h < 12) h += 12
    if (parts.ap === 'a' && h === 12) h = 0
    const p = (x: number | string) => String(x).padStart(2, '0')
    return { text, iso: `${parts.year}-${p(MONTHS[parts.month])}-${p(parts.day)}` + (parts.h ? `T${p(h)}:${parts.min}:00-05:00` : '') }
  },

  list: (v) => list(v),

  key_value: (v) => {
    const out: Record<string, string> = {}
    list(v).forEach((item) => {
      const i = item.indexOf(':')
      if (i > 0) out[norm(item.slice(0, i))] = item.slice(i + 1).trim()
    })
    return out
  },

  table: (v, def) => {
    const lines = v
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.startsWith('|'))
      .map((l) => l.replace(/^\||\|$/g, '').split('|').map((c) => c.trim()))
    if (!lines.length) return { columns: [], rows: [] }
    const head = lines[0]
    const aliases = def.column_aliases || {}
    const keys = head.map((h) => aliases[norm(h)] ?? norm(h))
    const numeric = def.numeric_columns || []
    const moneyCols = def.money_columns || []
    const body = lines.slice(1).filter((r) => !r.every((c) => /^:?-{2,}:?$/.test(c)))
    return {
      columns: head.map((label, i) => ({ key: keys[i], label })),
      rows: body.map((r) => {
        const o: Record<string, Value> = {}
        keys.forEach((k, i) => {
          const cell = r[i] === undefined ? '' : r[i]
          const isNum = numeric.includes(k) || (numeric.includes('*') && k !== def.x_axis)
          if (moneyCols.includes(k)) o[k] = money(cell)
          else o[k] = isNum ? (cell === '' ? null : parseNumber(cell)) : cell
        })
        return o
      }),
    }
  },

  code: (v) => {
    const m = v.match(/```(\w*)\n([\s\S]*?)\n?```/)
    return m ? { language: m[1] || null, code: m[2] } : { language: null, code: v.trim() }
  },

  enum: (v, def) => {
    const n = norm(v)
    const options = Object.entries(def.options || {})
    const names = (key: string, meta: { alias?: string[] }) => [key].concat(meta.alias || []).map(norm)
    const exact = options.find(([key, meta]) => names(key, meta).includes(n))
    const partial = exact ?? options.find(([key, meta]) => names(key, meta).some((x) => n.split('_').includes(x) || n.includes(x)))
    const score = def.numeric_thresholds ? parseNumber(v) : null
    const byScore =
      partial || score === null
        ? undefined
        : Object.entries(def.numeric_thresholds!)
            .sort((a, b) => b[1] - a[1])
            .find(([, min]) => (score > 1 ? score / 100 : score) >= min)
    const match = partial ?? (byScore && options.find(([key]) => key === byScore[0]))
    if (match) {
      const [key, meta] = match
      const { alias: _alias, ...rest } = meta
      return { value: key, ...rest }
    }
    return { value: null, text: v.trim(), invalid: true }
  },
}

interface Block {
  name: string
  line: number
  raw: { slot: string; text: string; line: number }[]
}

export function readBlocks(md: string): Block[] {
  const blocks: Block[] = []
  let comp: Block | null = null
  let slot: string | null = null
  let slotLine = 0
  let buf: string[] = []
  let inCode = false

  const closeSlot = () => {
    if (comp && slot !== null) {
      const text = buf.join('\n').trim()
      if (text) comp.raw.push({ slot, text, line: slotLine })
    }
    buf = []
  }

  md.replace(/\r\n/g, '\n')
    .split('\n')
    .forEach((line, i) => {
      if (/^\s*```/.test(line)) inCode = !inCode
      if (!inCode) {
        const h1 = line.match(/^#\s+(.+?)\s*$/)
        const h2 = line.match(/^##\s+([^:]+?)\s*(?::\s*(.*))?$/)
        if (h1) {
          closeSlot()
          comp = { name: h1[1].trim(), line: i + 1, raw: [] }
          blocks.push(comp)
          slot = '__default'
          slotLine = i + 1
          return
        }
        if (h2 && comp) {
          closeSlot()
          slot = h2[1].trim()
          slotLine = i + 1
          if (h2[2]) buf.push(h2[2])
          return
        }
      }
      if (comp) buf.push(line)
    })
  closeSlot()
  return blocks
}

export function extractAgentMarkdown(body: string): string {
  const text = body.trim()
  if (!text.startsWith('{')) return body
  try {
    const json = JSON.parse(text)
    const state = json?.orchestrator_response?.final_state ?? json?.final_state ?? json
    const strategist = state?.strategist_report ?? state?.strategist_result?.markdown
    const parts = [state?.analyzer_report, strategist].filter((p): p is string => typeof p === 'string' && p.trim() !== '')
    return parts.length ? parts.map((p) => p.trim()).join('\n\n\n') : body
  } catch {
    return body
  }
}

export const decodeEscapes = (md: string) => (!md.includes('\n') && md.includes('\\n') ? md.replace(/\\n/g, '\n').replace(/\\t/g, '\t') : md)

const BULLET = /^\s*[-*]\s+(.*)$/
const NUMERIC = /^[−+-]?[\d.,]+\s*%?$/

const GENERATED_LABELS = {
  es: { findings: 'Hallazgos', finding: 'Hallazgo', context: 'Contexto', field: 'Campo', value: 'Valor' },
  en: { findings: 'Findings', finding: 'Finding', context: 'Context', field: 'Field', value: 'Value' },
} satisfies Record<Lang, unknown>

const humanize = (key: string) => {
  const s = key.replace(/[_-]+/g, ' ').trim()
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const cell = (s: string) => s.replace(/\|/g, '/')

function bulletsOnly(b: Block): string[] | null {
  if (b.raw.length !== 1 || b.raw[0].slot !== '__default') return null
  const lines = b.raw[0].text.split('\n').filter((l) => l.trim() !== '')
  const items = lines.map((l) => l.match(BULLET)?.[1].trim())
  return items.every((i): i is string => i !== undefined) ? items : null
}

const splitPair = (item: string) => {
  const i = item.indexOf(':')
  return i > 0 ? { key: item.slice(0, i).trim(), value: item.slice(i + 1).trim() } : null
}

function expandBlocks(
  blocks: Block[],
  findComponent: (name: string) => string | undefined,
  findSlot: (def: ComponentDef, name: string) => string | undefined,
  defs: Record<string, ComponentDef>,
  contentLang: Lang,
): Block[] {
  const labels = GENERATED_LABELS[contentLang]
  const kpiKey = findComponent('kpi')
  const evidenceKey = findComponent('evidence')
  const context: { key: string; value: string }[] = []
  const out: Block[] = []

  for (const b of blocks) {
    const key = findComponent(b.name)
    const items = key ? bulletsOnly(b) : null
    if (!key || !items) {
      out.push(b)
      continue
    }
    const def = defs[key]
    const pairs = items.map(splitPair)

    if (pairs.every((p) => p && findSlot(def, p.key))) {
      out.push({ ...b, raw: pairs.map((p) => ({ slot: p!.key, text: p!.value, line: b.line })) })
    } else if (def.bullet_list === 'kpis' && kpiKey) {
      pairs.forEach((p, i) => {
        if (p && NUMERIC.test(p.value)) {
          out.push({ name: kpiKey, line: b.line, raw: [{ slot: 'label', text: humanize(p.key), line: b.line }, { slot: 'value', text: p.value, line: b.line }] })
        } else {
          context.push(p ?? { key: '—', value: items[i] })
        }
      })
    } else if (def.bullet_list === 'table') {
      const table = [`| ${labels.finding} |`, '|---|', ...items.map((i) => `| ${cell(i)} |`)].join('\n')
      out.push({ ...b, raw: [{ slot: 'title', text: labels.findings, line: b.line }, { slot: 'table', text: table, line: b.line }] })
    } else {
      out.push(b)
    }
  }

  if (context.length && evidenceKey) {
    const table = [`| ${labels.field} | ${labels.value} |`, '|---|---|', ...context.map((c) => `| ${cell(humanize(c.key))} | ${cell(c.value)} |`)].join('\n')
    out.push({ name: evidenceKey, line: 0, raw: [{ slot: 'title', text: labels.context, line: 0 }, { slot: 'table', text: table, line: 0 }] })
  }
  return out
}

export function parse(md: string, config: CentinelaConfig, lang: Lang, contentLang: Lang = lang): MdResult {
  const t = MESSAGES[lang]
  const errors: string[] = []
  const warnings: string[] = []
  const defs = config.components

  const findComponent = (name: string) => {
    const n = norm(name)
    return Object.keys(defs).find((k) => norm(k) === n || (defs[k].alias || []).map(norm).includes(n))
  }
  const findSlot = (def: ComponentDef, name: string) => {
    const n = norm(name)
    return Object.keys(def.slots).find((k) => norm(k) === n || (def.slots[k].alias || []).map(norm).includes(n))
  }

  const components: ViewComponent[] = []
  expandBlocks(readBlocks(decodeEscapes(extractAgentMarkdown(md))), findComponent, findSlot, defs, contentLang).forEach((b) => {
    const key = findComponent(b.name)
    if (!key) {
      errors.push(t.unknownComponent(b.line, b.name))
      return
    }
    const def = defs[key]
    const data: Record<string, Value> = {}

    b.raw.forEach(({ slot, text, line }) => {
      const sk = slot === '__default' ? def.default_slot : findSlot(def, slot)
      if (!sk) {
        if (slot === '__default') warnings.push(t.looseTextIgnored(key, b.line))
        else errors.push(t.unknownSlot(line, key, slot))
        return
      }
      const sdef = def.slots[sk]
      const value = TYPES[sdef.type] ? TYPES[sdef.type](text, sdef) : text
      if (value && value.invalid) errors.push(t.invalidOption(line, text, sk, key))
      if (sdef.type === 'number' && value === null) errors.push(t.invalidNumber(line, text, sk, key))
      if (sdef.max && typeof value === 'string' && value.length > sdef.max) warnings.push(t.tooLong(line, sk, value.length, sdef.max))
      if (sdef.max && Array.isArray(value) && value.length > sdef.max) warnings.push(t.tooMany(line, sk, value.length, sdef.max))
      data[sk] = value
    })

    Object.entries(def.slots).forEach(([sk, sdef]) => {
      if (data[sk] === undefined && sdef.default !== undefined) {
        data[sk] = sdef.type === 'enum' ? { value: sdef.default, ...(sdef.options?.[String(sdef.default)] ?? {}) } : sdef.default
      }
      if (sdef.required && data[sk] === undefined) errors.push(t.missingSlot(b.line, key, sk))
    })

    components.push({ component: key, render: def.render, zone: def.zone, order: def.order, data })
  })

  Object.entries(defs).forEach(([key, def]) => {
    const n = components.filter((c) => c.component === key).length
    if (def.required && n === 0) errors.push(t.missingComponent(key))
    if (!def.repeatable && n > 1) errors.push(t.repeated(key, n))
    if (def.min && n > 0 && n < def.min) errors.push(t.belowMin(key, def.min, n))
    if (def.max && n > def.max) errors.push(t.aboveMax(key, def.max, n))
  })

  components.sort((a, b) => a.order - b.order)

  const view: ViewZone[] = (config.zones || [])
    .map((z) => ({ ...z, components: components.filter((c) => c.zone === z.id) }))
    .filter((z) => z.components.length)

  const alert: Record<string, Value> = {}
  components.forEach((c) => {
    const def = defs[c.component]
    if (def.collection) {
      ;(alert[def.collection] = alert[def.collection] || []).push(c.data)
    } else {
      Object.entries(c.data as Record<string, Value>).forEach(([sk, v]) => {
        const field = def.slots[sk].field
        if (field) setPath(alert, field, v && v.value !== undefined && def.slots[sk].type === 'enum' ? v.value : v)
      })
    }
  })

  return { ok: errors.length === 0, errors, warnings, alert, view }
}
