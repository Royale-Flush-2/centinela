import type { Confidence, Lang, Topic } from '../src/domain.ts'
import { formatDate, formatMoney, formatNumber, formatShortDate, formatTime, formatValue } from '../src/format.ts'
import { localize, type AlertRecord, type Localized } from './data.ts'

const POLICY: Record<Topic, string> = {
  inventory: 'INV-POL-004 §3.1',
  receivables: 'CAR-POL-002 §1.4',
  margin: 'MAR-POL-001 §2.2',
  returns: 'DEV-POL-003 §1.1',
  sales: 'VEN-POL-005 §4.2',
}

interface ActionTemplate {
  title: Localized
  details: Localized
  cost: number | null
  concept: Localized
  confidence: Confidence
  assumption: Localized
}

const NONE: Localized = { es: 'Ninguno', en: 'None' }
const LOST_SALES: Localized = { es: 'Venta perdida estimada', en: 'Estimated lost sales' }
const DISCOUNT: Localized = { es: 'Descuento', en: 'Discount' }

function actions(a: AlertRecord): [ActionTemplate, ActionTemplate] {
  const rising = a.series.thresholdType === 'max'
  switch (a.topic) {
    case 'inventory':
      return rising
        ? [
            {
              title: { es: 'Activar una promoción para rotar el inventario', en: 'Run a promotion to turn the inventory over' },
              details: { es: 'Descuento temporal en los clientes con más rotación del producto.', en: 'Temporary discount for the customers with the highest product turnover.' },
              cost: 3_200_000,
              concept: DISCOUNT,
              confidence: 'medium',
              assumption: { es: 'La demanda responde al descuento como en promociones anteriores.', en: 'Demand responds to the discount as in previous promotions.' },
            },
            {
              title: { es: 'Pausar las compras del producto por 2 semanas', en: 'Pause purchases of the product for 2 weeks' },
              details: { es: 'Deja que el inventario baje sin nuevas órdenes de compra.', en: 'Lets inventory go down without new purchase orders.' },
              cost: null,
              concept: NONE,
              confidence: 'high',
              assumption: { es: 'No hay pedidos grandes confirmados para las próximas 2 semanas.', en: 'There are no large confirmed orders for the next 2 weeks.' },
            },
          ]
        : [
            {
              title: { es: 'Trasladar inventario desde otro CEDI', en: 'Transfer inventory from another DC' },
              details: {
                es: 'Mueve unidades desde el CEDI con mayor cobertura sin dejarlo por debajo del mínimo.',
                en: 'Moves units from the DC with the highest coverage without taking it below the minimum.',
              },
              cost: 6_800_000,
              concept: { es: 'Flete', en: 'Freight' },
              confidence: 'high',
              assumption: { es: 'Hay transporte disponible en las próximas 24 horas.', en: 'Transport is available in the next 24 hours.' },
            },
            {
              title: { es: 'Adelantar la orden de compra al proveedor', en: 'Bring the purchase order forward with the supplier' },
              details: { es: 'Pide una entrega urgente con recargo sobre el precio de compra.', en: 'Requests a rush delivery with a surcharge on the purchase price.' },
              cost: 8_100_000,
              concept: { es: 'Recargo', en: 'Surcharge' },
              confidence: 'medium',
              assumption: { es: 'El proveedor confirma capacidad para la entrega urgente.', en: 'The supplier confirms capacity for the rush delivery.' },
            },
          ]
    case 'receivables':
      return [
        {
          title: { es: 'Congelar el cupo de crédito del cliente', en: 'Freeze the customer’s credit line' },
          details: { es: 'Los pedidos nuevos quedan en espera hasta que pague las facturas vencidas.', en: 'New orders are put on hold until the overdue invoices are paid.' },
          cost: null,
          concept: NONE,
          confidence: 'high',
          assumption: { es: 'El cliente no tiene acuerdos de pago vigentes.', en: 'The customer has no payment agreements in force.' },
        },
        {
          title: { es: 'Pasar los pedidos nuevos a pago de contado', en: 'Switch new orders to cash payment' },
          details: { es: 'Mantiene la venta sin aumentar la deuda del cliente.', en: 'Keeps the sale without increasing the customer’s debt.' },
          cost: 1_500_000,
          concept: LOST_SALES,
          confidence: 'medium',
          assumption: { es: 'El cliente acepta comprar de contado.', en: 'The customer agrees to buy in cash.' },
        },
      ]
    case 'margin':
      return [
        {
          title: { es: 'Ajustar los descuentos por volumen a la política', en: 'Bring volume discounts back to policy' },
          details: { es: 'Revisa los descuentos que superan el máximo permitido en el canal.', en: 'Reviews the discounts above the maximum allowed in the channel.' },
          cost: 2_400_000,
          concept: LOST_SALES,
          confidence: 'medium',
          assumption: { es: 'Los clientes mantienen su volumen con el nuevo descuento.', en: 'Customers keep their volume with the new discount.' },
        },
        {
          title: { es: 'Subir 3% el precio de lista en el canal', en: 'Raise the channel list price by 3%' },
          details: { es: 'Compensa el alza de costos sin cambiar los descuentos.', en: 'Offsets the cost increase without changing the discounts.' },
          cost: 4_000_000,
          concept: LOST_SALES,
          confidence: 'low',
          assumption: { es: 'La competencia no baja precios en el mismo periodo.', en: 'Competitors do not cut prices in the same period.' },
        },
      ]
    case 'returns':
      return [
        {
          title: { es: 'Revisar el empaque y el cargue de la ruta', en: 'Review the route’s packaging and loading' },
          details: { es: 'Auditoría del cargue en bodega y del estado del vehículo.', en: 'Audit of the warehouse loading and the vehicle’s condition.' },
          cost: 800_000,
          concept: { es: 'Auditoría', en: 'Audit' },
          confidence: 'high',
          assumption: { es: 'Las averías vienen del transporte y no del proveedor.', en: 'The damage comes from transport and not from the supplier.' },
        },
        {
          title: { es: 'Cambiar la ventana de entrega de la ruta', en: 'Change the route’s delivery window' },
          details: { es: 'Entregas en la mañana para evitar producto con fecha corta.', en: 'Morning deliveries to avoid product with short expiry dates.' },
          cost: 1_200_000,
          concept: { es: 'Horas extra', en: 'Overtime' },
          confidence: 'medium',
          assumption: { es: 'Los clientes reciben en el nuevo horario.', en: 'Customers accept deliveries in the new time slot.' },
        },
      ]
    case 'sales':
      return [
        {
          title: { es: 'Activar exhibición adicional en tiendas clave', en: 'Add extra display space in key stores' },
          details: { es: 'Material de punto de venta en las tiendas con mayor caída.', en: 'Point-of-sale material in the stores with the biggest drop.' },
          cost: 5_500_000,
          concept: { es: 'Material POP', en: 'POP material' },
          confidence: 'medium',
          assumption: { es: 'La caída se explica por visibilidad y no por precio.', en: 'The drop is explained by visibility and not by price.' },
        },
        {
          title: { es: 'Lanzar una promoción de contraataque por 2 semanas', en: 'Launch a 2-week counter promotion' },
          details: { es: 'Responde a la promoción del competidor en la misma zona.', en: 'Answers the competitor’s promotion in the same zone.' },
          cost: 9_000_000,
          concept: DISCOUNT,
          confidence: 'low',
          assumption: { es: 'El competidor no extiende su promoción.', en: 'The competitor does not extend its promotion.' },
        },
      ]
  }
}

const TEXT = {
  es: {
    min: 'Mínimo',
    max: 'Máximo',
    twoWeeksAgo: 'Hace dos semanas',
    periodStart: 'Valor al inicio del periodo',
    daysOff: 'Días fuera de política',
    days: 'días',
    units: 'unidades',
    ofLast: (n: number) => `De los últimos ${n}`,
    actual: 'Real',
    policyLimit: (limit: string, value: string) => `${limit} de política: ${value}`,
    rule: (label: string, min: boolean, value: string, type: string) =>
      `«${label} debe mantenerse ${min ? 'por encima de' : 'por debajo de'} ${value} según la política de ${type}.»`,
    today: (value: string, gap: string, min: boolean) => `Hoy: ${value}, ${gap} ${min ? 'por debajo del mínimo' : 'por encima del máximo'}.`,
    noDirectCost: 'Sin costo directo',
    yes: 'sí',
    no: 'no',
    doubt: (label: string) => `Esta propuesta la generó el Estratega simulado a partir de la serie de ${label}; las cifras de protección son estimaciones.`,
    reasons: ['Los datos no son correctos', 'Cuesta más de lo que protege', 'Ya lo estamos resolviendo por otra vía', 'Otro motivo'],
    evidenceDescription: (n: number) => `Valor diario del indicador en los últimos ${n} días.`,
    evidenceTitle: (label: string, entity: string) => `${label} diario · ${entity}`,
    dateColumn: 'Fecha',
    calculation: (summary: string, amount: string) => `${summary}. Riesgo estimado: ${amount} al mes.`,
    agents: { watcher: 'Vigía', analyst: 'Analista', strategist: 'Estratega' },
    steps: { watcher: 'Detectó', analyst: 'Explicó', strategist: 'Propuso' },
    detected: (label: string, value: string, limit: string, threshold: string) => `Detectó ${label} de ${value} (${limit} ${threshold}).`,
    reviewed: (n: number, policy: string) => `Revisó la serie de ${n} días y la cruzó con la política ${policy}.`,
    proposed: 'Propuso 2 acciones y calculó su impacto.',
    questions: ['¿Qué pasa si no hacemos nada?', '¿Cuál acción protege más por peso invertido?'],
  },
  en: {
    min: 'Minimum',
    max: 'Maximum',
    twoWeeksAgo: 'Two weeks ago',
    periodStart: 'Value at the start of the period',
    daysOff: 'Days out of policy',
    days: 'days',
    units: 'units',
    ofLast: (n: number) => `Of the last ${n}`,
    actual: 'Actual',
    policyLimit: (limit: string, value: string) => `Policy ${limit.toLowerCase()}: ${value}`,
    rule: (label: string, min: boolean, value: string, type: string) =>
      `“${label} must stay ${min ? 'above' : 'below'} ${value} according to the ${type.toLowerCase()} policy.”`,
    today: (value: string, gap: string, min: boolean) => `Today: ${value}, ${gap} ${min ? 'below the minimum' : 'above the maximum'}.`,
    noDirectCost: 'No direct cost',
    yes: 'yes',
    no: 'no',
    doubt: (label: string) => `This proposal was generated by the simulated Strategist from the ${label} series; the protection figures are estimates.`,
    reasons: ['The data is wrong', 'It costs more than it protects', 'We are already solving it another way', 'Other reason'],
    evidenceDescription: (n: number) => `Daily value of the indicator over the last ${n} days.`,
    evidenceTitle: (label: string, entity: string) => `Daily ${label.toLowerCase()} · ${entity}`,
    dateColumn: 'Date',
    calculation: (summary: string, amount: string) => `${summary}. Estimated risk: ${amount} per month.`,
    agents: { watcher: 'Watcher', analyst: 'Analyst', strategist: 'Strategist' },
    steps: { watcher: 'Detected', analyst: 'Explained', strategist: 'Proposed' },
    detected: (label: string, value: string, limit: string, threshold: string) => `Detected ${label} of ${value} (${limit.toLowerCase()} ${threshold}).`,
    reviewed: (n: number, policy: string) => `Reviewed the ${n}-day series and checked it against policy ${policy}.`,
    proposed: 'Proposed 2 actions and calculated their impact.',
    questions: ['What happens if we do nothing?', 'Which action protects the most per peso invested?'],
  },
}

export function generateMarkdown(record: AlertRecord, lang: Lang): string {
  const t = TEXT[lang]
  const a = localize(record, lang)
  const money = (v: number) => formatMoney(v, lang)
  const num = (v: number) => formatNumber(v, lang)
  const value = (v: number) => formatValue(v, a.series.unit, lang)
  const dateTime = (d: Date) => `${formatDate(d, lang)}, ${formatTime(d, lang)}`

  const created = new Date(a.createdAt)
  const plus = (min: number) => new Date(created.getTime() + min * 60_000)
  const { series } = a
  const last = series.values[series.values.length - 1]
  const first = series.values[0]
  const isMin = series.thresholdType === 'min'
  const limit = isMin ? t.min : t.max
  const outside = series.values.filter((v) => (isMin ? v < series.threshold : v > series.threshold)).length
  const gap = Math.abs(last - series.threshold)
  const [a1, a2] = actions(record).map((x) => ({
    title: x.title[lang],
    details: x.details[lang],
    cost: x.cost === null ? t.noDirectCost : money(x.cost),
    concept: x.concept[lang],
    confidence: x.confidence,
    assumption: x.assumption[lang],
  }))
  const p1 = Math.round(a.amountAtRisk * 0.6)
  const p2 = Math.round(a.amountAtRisk * 0.35)
  const p12 = Math.round(a.amountAtRisk * 0.85)
  const [affected, place] = a.entityLabel.split(' · ')
  const dates = series.values.map((_, i) => {
    const d = new Date(created)
    d.setDate(d.getDate() - (series.values.length - 1 - i))
    return formatShortDate(d, lang)
  })
  const unit = series.unit ? (series.unit === 'days' ? t.days : series.unit) : t.units
  const kpiUnit = series.unit === 'days' ? t.days : series.unit
  const slug = record.series.label.en.toLowerCase().replace(/[^a-z0-9]+/g, '_')
  const policy = POLICY[a.topic]

  return `# hero
${a.description}

## id: ${a.id}

## title:
${a.headline}

## severity: ${a.severity}

## type: ${a.typeLabel}

## status: proposal

## confidence: ${a.confidence}

## amount at risk: ${money(a.amountAtRisk)}

## entity:
- affected: ${affected}
${place ? `- place: ${place}\n` : ''}
## detected at: ${dateTime(created)}

## updated at: ${dateTime(plus(3))}

## agents:
- watcher: ${t.steps.watcher}
- analyst: ${t.steps.analyst}
- strategist: ${t.steps.strategist}


# kpi
## label: ${series.label}
## value: ${num(last)}
${kpiUnit ? `## unit: ${kpiUnit}\n` : ''}## note: ${limit} ${value(series.threshold)}
## tone: critical


# kpi
## label: ${t.twoWeeksAgo}
## value: ${num(first)}
${kpiUnit ? `## unit: ${kpiUnit}\n` : ''}## note: ${t.periodStart}


# kpi
## label: ${t.daysOff}
## value: ${outside}
## unit: ${t.days}
## note: ${t.ofLast(series.values.length)}


# chart
${series.label} · ${a.entityLabel}

## unit: ${unit}
## threshold: ${num(series.threshold)}
## threshold label: ${t.policyLimit(limit, value(series.threshold))}
## today: ${dates[dates.length - 1]}

## series:
- actual: ${t.actual}

## data:
| date | actual |
|------|--------|
${dates.map((d, i) => `| ${d} | ${num(series.values[i])} |`).join('\n')}


# rule
${t.rule(series.label, isMin, value(series.threshold), a.typeLabel.toLowerCase())}

## code: ${policy}
## situation: ${t.today(value(last), value(Math.round(gap * 10) / 10), isMin)}


# action
${a1.details}

## id: a1
## title: ${a1.title}
## protects: ${money(p1)}
## cost: ${a1.cost}
## cost concept: ${a1.concept}
## confidence: ${a1.confidence}
## selected: ${t.yes}
## assumptions:
- ${a1.assumption}


# action
${a2.details}

## id: a2
## title: ${a2.title}
## protects: ${money(p2)}
## cost: ${a2.cost}
## cost concept: ${a2.concept}
## confidence: ${a2.confidence}
## selected: ${a2.confidence === 'low' ? t.no : t.yes}
## assumptions:
- ${a2.assumption}


# doubt
${t.doubt(series.label.toLowerCase())}


# decision
## combinations:
| actions | protects |
|---------|----------|
| a1 | ${money(p1)} |
| a2 | ${money(p2)} |
| a1+a2 | ${money(p12)} |

## rejection reasons:
${t.reasons.map((r) => `- ${r}`).join('\n')}


# evidence
${t.evidenceDescription(series.values.length)}

## title: ${t.evidenceTitle(series.label, a.entityLabel)}
## highlight: ${dates[dates.length - 1]}

## table:
| ${t.dateColumn} | ${series.label} |
|-------|------|
${dates.map((d, i) => `| ${d} | ${value(series.values[i])} |`).join('\n')}

## sql:
\`\`\`sql
SELECT date, value
FROM daily_indicators
WHERE alert_id = '${a.id}'
  AND indicator = '${slug}'
ORDER BY date;
\`\`\`


# calculation
${t.calculation(series.summary, money(a.amountAtRisk))}

## rule version: ${policy}


# log
## events:
| date | who | event | status |
|------|-----|-------|--------|
| ${dateTime(created)} | ${t.agents.watcher} | ${t.detected(series.label.toLowerCase(), value(last), limit, value(series.threshold))} | new |
| ${dateTime(plus(1))} | ${t.agents.analyst} | ${t.reviewed(series.values.length, policy)} | analyzing |
| ${dateTime(plus(3))} | ${t.agents.strategist} | ${t.proposed} | proposal |


# chat
## suggested questions:
${t.questions.map((q) => `- ${q}`).join('\n')}
`
}
