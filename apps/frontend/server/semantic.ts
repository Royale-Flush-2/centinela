import type { Lang } from '../src/domain.ts'
import type { AlertRecord, Localized } from './data.ts'


interface Concept {
  label: Localized
  synonyms: string[]
}

const CONCEPTS: Record<string, Concept> = {
  inventory: {
    label: { es: 'inventario', en: 'inventory' },
    synonyms: [
      'inventario', 'stock', 'existencia', 'agota', 'agotado', 'agotar', 'quiebre', 'faltante', 'falta',
      'desabastecimiento', 'cobertura', 'bodega', 'cedi', 'reposicion', 'abastecimiento', 'sobrestock',
      'exceso', 'acaba', 'acabar', 'quedar', 'entrega', 'proveedor', 'surtido',
      'inventory', 'stockout', 'shortage', 'running', 'runs', 'coverage', 'warehouse', 'replenishment',
      'supply', 'overstock', 'excess', 'delivery', 'supplier',
    ],
  },
  receivables: {
    label: { es: 'cartera y pagos', en: 'receivables and payments' },
    synonyms: [
      'cartera', 'mora', 'moroso', 'deuda', 'debe', 'deben', 'pago', 'pagar', 'paga', 'pagan', 'impago',
      'credito', 'cupo', 'cobro', 'cobranza', 'vencida', 'vencido', 'factura', 'cheque',
      'receivable', 'overdue', 'debt', 'owe', 'owes', 'pay', 'paying', 'payment', 'unpaid', 'credit',
      'collection', 'invoice', 'check', 'default',
    ],
  },
  margin: {
    label: { es: 'margen y precios', en: 'margin and prices' },
    synonyms: [
      'margen', 'rentabilidad', 'rentable', 'ganancia', 'utilidad', 'descuento', 'precio', 'costo',
      'politica', 'caro', 'barato',
      'margin', 'profit', 'profitability', 'discount', 'price', 'pricing', 'cost', 'policy', 'expensive', 'cheap',
    ],
  },
  returns: {
    label: { es: 'devoluciones', en: 'returns' },
    synonyms: [
      'devolucion', 'devuelto', 'devuelven', 'devolver', 'retorno', 'averia', 'averiado', 'reclamo', 'danado', 'roto', 'ruta',
      'return', 'returned', 'damage', 'damaged', 'complaint', 'broken', 'route',
    ],
  },
  sales: {
    label: { es: 'ventas', en: 'sales' },
    synonyms: [
      'venta', 'vender', 'vende', 'venden', 'demanda', 'pedido', 'caida', 'cayo', 'competidor', 'promocion', 'unidad',
      'sale', 'sell', 'sells', 'demand', 'order', 'drop', 'fell', 'competitor', 'promotion', 'unit',
    ],
  },
  urgency: {
    label: { es: 'urgencia', en: 'urgency' },
    synonyms: [
      'urgente', 'critica', 'critico', 'grave', 'prioridad', 'prioritario', 'riesgo', 'perdida', 'peligro', 'importante',
      'urgent', 'critical', 'serious', 'priority', 'risk', 'loss', 'danger', 'important',
    ],
  },
  customers: {
    label: { es: 'clientes', en: 'customers' },
    synonyms: [
      'cliente', 'tienda', 'autoservicio', 'supermercado', 'comprador', 'canal', 'mayorista', 'distribuidor', 'distribuidora',
      'customer', 'client', 'store', 'shop', 'supermarket', 'buyer', 'channel', 'wholesale', 'distributor',
    ],
  },
  bogota: { label: { es: 'Bogotá', en: 'Bogotá' }, synonyms: ['bogota', 'centro', 'capital'] },
  cali: { label: { es: 'Cali', en: 'Cali' }, synonyms: ['cali', 'valle', 'pacifico', 'pacific'] },
  medellin: { label: { es: 'Medellín', en: 'Medellín' }, synonyms: ['medellin', 'antioquia', 'paisa'] },
  coast: { label: { es: 'Costa', en: 'Coast' }, synonyms: ['costa', 'coast', 'caribe', 'caribbean', 'barranquilla', 'cartagena', 'santa', 'marta'] },
}

const STOP_WORDS = new Set([
  'el', 'la', 'los', 'las', 'de', 'del', 'y', 'o', 'a', 'en', 'que', 'un', 'una', 'unos', 'unas', 'por', 'para',
  'con', 'sin', 'se', 'su', 'sus', 'al', 'lo', 'es', 'son', 'esta', 'este', 'estan', 'mas', 'muy', 'hay', 'nos',
  'me', 'mi', 'le', 'les', 'ya', 'como', 'cual', 'cuales', 'donde', 'quien', 'quienes', 'todo', 'todos', 'algo',
  'the', 'an', 'of', 'in', 'on', 'at', 'to', 'for', 'and', 'or', 'is', 'are', 'who', 'what', 'which', 'that',
  'do', 'does', 'not', 'don', 't', 'my', 'i', 'we', 'our', 'with', 'by', 'from', 'it', 'this', 'these', 'those',
  'all', 'any', 'some', 'out',
])

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
}

function stem(token: string): string {
  if (token.length > 5 && token.endsWith('es')) return token.slice(0, -2)
  if (token.length > 4 && token.endsWith('s')) return token.slice(0, -1)
  return token
}

function tokenize(text: string): string[] {
  return normalize(text)
    .split(/\s+/)
    .filter((t) => t && !STOP_WORDS.has(t))
    .map(stem)
}

function matches(token: string, synonym: string): boolean {
  if (token === synonym) return true
  return Math.min(token.length, synonym.length) >= 5 && token.slice(0, 5) === synonym.slice(0, 5)
}

const SYNONYMS = Object.fromEntries(Object.entries(CONCEPTS).map(([key, c]) => [key, c.synonyms.map(stem)]))

function conceptVector(tokens: string[]): Map<string, number> {
  const v = new Map<string, number>()
  for (const t of tokens) {
    for (const [key, synonyms] of Object.entries(SYNONYMS)) {
      if (synonyms.some((s) => matches(t, s))) v.set(key, (v.get(key) ?? 0) + 1)
    }
  }
  return v
}

function cosine(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0
  for (const [k, x] of a) dot += x * (b.get(k) ?? 0)
  const norm = (m: Map<string, number>) => Math.sqrt([...m.values()].reduce((s, x) => s + x * x, 0))
  const d = norm(a) * norm(b)
  return d === 0 ? 0 : dot / d
}

function alertText(a: AlertRecord): string {
  const urgency = a.severity === 'critical' ? 'critica urgente grave critical urgent' : a.severity === 'high' ? 'urgente prioridad urgent priority' : ''
  const both = (l: Localized) => `${l.es} ${l.en}`
  return [both(a.headline), both(a.headline), both(a.typeLabel), both(a.entityLabel), both(a.description), CONCEPTS[a.topic]?.label.es, a.topic, urgency].join(' ')
}

export const RELEVANCE_THRESHOLD = 0.25

export function score(query: string, alert: AlertRecord, lang: Lang): { score: number; matches: string[] } {
  const tq = tokenize(query)
  if (tq.length === 0) return { score: 0, matches: [] }
  const td = tokenize(alertText(alert))

  const vq = conceptVector(tq)
  const vd = conceptVector(td)
  const lexical = tq.filter((t) => td.some((d) => matches(d, t))).length / tq.length

  const total = vq.size === 0 ? lexical : 0.65 * cosine(vq, vd) + 0.35 * lexical
  const shared = [...vq.keys()].filter((k) => vd.has(k)).map((k) => CONCEPTS[k].label[lang])
  return { score: Math.round(total * 100) / 100, matches: shared }
}
