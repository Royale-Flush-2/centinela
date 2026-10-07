import type { Alert, Confidence, Lang, Series, Severity, Topic } from '../src/domain.ts'

export type Localized = Record<Lang, string>

export interface SeriesRecord extends Omit<Series, 'label' | 'summary'> {
  label: Localized
  summary: Localized
}

export interface AlertRecord extends Omit<Alert, 'typeLabel' | 'entityLabel' | 'headline' | 'description' | 'agent' | 'series'> {
  typeLabel: Localized
  entityLabel: Localized
  headline: Localized
  description: Localized
  agent: Localized | null
  series: SeriesRecord
}

export function localize(a: AlertRecord, lang: Lang): Alert {
  return {
    ...a,
    typeLabel: a.typeLabel[lang],
    entityLabel: a.entityLabel[lang],
    headline: a.headline[lang],
    description: a.description[lang],
    agent: a.agent?.[lang] ?? null,
    series: { ...a.series, label: a.series.label[lang], summary: a.series.summary[lang] },
  }
}

const COVERAGE: Localized = { es: 'Cobertura', en: 'Coverage' }
const DAYS_OVERDUE: Localized = { es: 'Días de mora', en: 'Days overdue' }
const GROSS_MARGIN: Localized = { es: 'Margen bruto', en: 'Gross margin' }
const RETURNS: Localized = { es: 'Devoluciones', en: 'Returns' }
const UNITS_PER_DAY: Localized = { es: 'Unidades / día', en: 'Units / day' }

const STOCKOUT: Localized = { es: 'Quiebre de inventario', en: 'Stockout' }
const OVERDUE: Localized = { es: 'Cartera vencida', en: 'Overdue receivables' }
const LOW_MARGIN: Localized = { es: 'Margen bajo política', en: 'Margin below policy' }
const SALES_DROP: Localized = { es: 'Caída de ventas', en: 'Sales drop' }

export const INITIAL_ALERTS: AlertRecord[] = [
  {
    id: 'ALR-CLI-RIESGO-99',
    severity: 'high',
    confidence: 'high',
    status: 'proposal',
    topic: 'receivables',
    typeLabel: OVERDUE,
    entityLabel: { es: 'Cliente CLI-RIESGO-99', en: 'Client CLI-RIESGO-99' },
    headline: { es: 'Anomalía en cliente CLI-RIESGO-99', en: 'Anomaly in client CLI-RIESGO-99' },
    description: {
      es: 'El cliente tiene $15.000.000 vencidos, 120 días de mora máxima y paga en promedio a 95 días.',
      en: 'The client has $15,000,000 overdue, 120 days maximum delinquency and pays at 95 days on average.',
    },
    amountAtRisk: 15_000_000,
    createdAt: '2026-10-03T09:00:00-05:00',
    agent: null,
    series: {
      label: DAYS_OVERDUE,
      unit: '',
      values: [95, 120],
      threshold: 30,
      thresholdType: 'max',
      summary: {
        es: 'Días de mora: pago promedio a 95 días y mora máxima de 120; el máximo es 30',
        en: 'Days overdue: 95-day average payment and 120 maximum; the maximum is 30',
      },
    },
  },
  {
    id: 'ALR-1002-017',
    severity: 'critical',
    confidence: 'high',
    status: 'proposal',
    topic: 'inventory',
    typeLabel: STOCKOUT,
    entityLabel: { es: 'Aceite vegetal 3 L · CEDI Bogotá', en: 'Vegetable oil 3 L · Bogotá DC' },
    headline: {
      es: 'El aceite vegetal 3 L se agota en el CEDI Bogotá el 6 oct, 8 días antes de la próxima entrega',
      en: 'Vegetable oil 3 L runs out at the Bogotá DC on Oct 6, 8 days before the next delivery',
    },
    description: {
      es: 'La cobertura cayó de 14,5 a 4,2 días por un pico de pedidos de supermercados. Propuesta: traslado de 1.800 unidades desde el CEDI Medellín y adelantar la orden de compra al proveedor.',
      en: 'Coverage fell from 14.5 to 4.2 days because of a spike in supermarket orders. Proposal: transfer 1,800 units from the Medellín DC and bring the purchase order forward with the supplier.',
    },
    amountAtRisk: 579_200_000,
    createdAt: '2026-10-02T08:10:00-05:00',
    agent: null,
    series: {
      label: COVERAGE,
      unit: 'days',
      values: [14.5, 14.1, 13.6, 13.0, 12.1, 11.4, 10.6, 9.6, 8.7, 7.8, 6.9, 6.0, 5.1, 4.2],
      threshold: 10,
      thresholdType: 'min',
      summary: {
        es: 'Cobertura: bajó de 14,5 a 4,2 días en dos semanas; el mínimo es 10',
        en: 'Coverage: fell from 14.5 to 4.2 days in two weeks; the minimum is 10',
      },
    },
  },
  {
    id: 'ALR-0930-008',
    severity: 'high',
    confidence: 'medium',
    status: 'proposal',
    topic: 'receivables',
    typeLabel: OVERDUE,
    entityLabel: { es: 'Autoservicio El Progreso · Cali', en: 'Autoservicio El Progreso · Cali' },
    headline: {
      es: 'Autoservicio El Progreso lleva 47 días de mora y sigue comprando a crédito',
      en: 'Autoservicio El Progreso is 47 days overdue and keeps buying on credit',
    },
    description: {
      es: 'El cliente debe 3 facturas vencidas y abrió 2 pedidos nuevos a crédito esta semana. Propuesta: congelar el cupo de crédito y pasar a pago de contado hasta normalizar la deuda.',
      en: 'The customer owes 3 overdue invoices and opened 2 new credit orders this week. Proposal: freeze the credit line and switch to cash payment until the debt is normalized.',
    },
    amountAtRisk: 186_400_000,
    createdAt: '2026-09-30T10:25:00-05:00',
    agent: null,
    series: {
      label: DAYS_OVERDUE,
      unit: '',
      values: [12, 14, 15, 18, 20, 22, 25, 27, 30, 33, 36, 40, 43, 47],
      threshold: 30,
      thresholdType: 'max',
      summary: { es: 'Días de mora: subieron de 12 a 47; el máximo es 30', en: 'Days overdue: rose from 12 to 47; the maximum is 30' },
    },
  },
  {
    id: 'ALR-1001-011',
    severity: 'medium',
    confidence: 'medium',
    status: 'analyzing',
    topic: 'margin',
    typeLabel: LOW_MARGIN,
    entityLabel: { es: 'Canal mayorista · Costa', en: 'Wholesale channel · Coast' },
    headline: {
      es: 'El margen del canal mayorista en la Costa cayó a 21,4%, por debajo del mínimo de 22%',
      en: 'The wholesale channel margin on the Coast fell to 21.4%, below the 22% minimum',
    },
    description: {
      es: 'Los descuentos por volumen a 4 distribuidores de Barranquilla y Cartagena superan la política de precios. Rentabilidad en baja durante 3 semanas.',
      en: 'Volume discounts to 4 distributors in Barranquilla and Cartagena exceed the pricing policy. Profitability has been falling for 3 weeks.',
    },
    amountAtRisk: 64_800_000,
    createdAt: '2026-10-01T15:40:00-05:00',
    agent: { es: 'Analista revisando descuentos por cliente · paso 2 de 3', en: 'Analyst reviewing discounts by customer · step 2 of 3' },
    series: {
      label: GROSS_MARGIN,
      unit: '%',
      values: [24.8, 24.6, 24.9, 24.2, 23.8, 23.5, 23.1, 22.9, 22.4, 22.1, 21.9, 21.7, 21.6, 21.4],
      threshold: 22,
      thresholdType: 'min',
      summary: { es: 'Margen bruto: bajó de 24,8% a 21,4%; el mínimo es 22%', en: 'Gross margin: fell from 24.8% to 21.4%; the minimum is 22%' },
    },
  },
  {
    id: 'ALR-1002-004',
    severity: 'low',
    confidence: 'low',
    status: 'new',
    topic: 'returns',
    typeLabel: RETURNS,
    entityLabel: { es: 'Ruta 12 · Barranquilla', en: 'Route 12 · Barranquilla' },
    headline: { es: 'Las devoluciones de la ruta 12 subieron a 3,4% esta semana', en: 'Returns on route 12 rose to 3.4% this week' },
    description: {
      es: 'Los clientes de la ruta devuelven producto por empaque averiado y fechas cortas de vencimiento.',
      en: 'Customers on the route return product because of damaged packaging and short expiry dates.',
    },
    amountAtRisk: 8_300_000,
    createdAt: '2026-10-02T07:55:00-05:00',
    agent: { es: 'En cola para el Analista', en: 'Queued for the Analyst' },
    series: {
      label: RETURNS,
      unit: '%',
      values: [2.1, 2.0, 2.3, 2.2, 2.4, 2.6, 2.5, 2.8, 2.9, 3.1, 3.0, 3.2, 3.3, 3.4],
      threshold: 3,
      thresholdType: 'max',
      summary: { es: 'Devoluciones: subieron de 2,1% a 3,4%; el máximo es 3%', en: 'Returns: rose from 2.1% to 3.4%; the maximum is 3%' },
    },
  },
  {
    id: 'ALR-0929-003',
    severity: 'medium',
    confidence: 'high',
    status: 'approved',
    topic: 'sales',
    typeLabel: SALES_DROP,
    entityLabel: { es: 'Galletas surtidas · CEDI Cali', en: 'Assorted cookies · Cali DC' },
    headline: {
      es: 'La venta de galletas surtidas en el CEDI Cali cayó 18% frente al mes anterior',
      en: 'Assorted cookie sales at the Cali DC fell 18% versus last month',
    },
    description: {
      es: 'La demanda bajó en tiendas de barrio tras la entrada de un competidor. Se aprobó una activación con exhibición adicional en 40 tiendas.',
      en: 'Demand fell in neighborhood stores after a competitor entered. An activation with extra display space in 40 stores was approved.',
    },
    amountAtRisk: 42_500_000,
    createdAt: '2026-09-29T09:15:00-05:00',
    agent: null,
    series: {
      label: UNITS_PER_DAY,
      unit: '',
      values: [520, 515, 508, 500, 492, 480, 470, 466, 455, 448, 440, 436, 430, 426],
      threshold: 470,
      thresholdType: 'min',
      summary: {
        es: 'Unidades por día: bajaron de 520 a 426; el mínimo esperado es 470',
        en: 'Units per day: fell from 520 to 426; the expected minimum is 470',
      },
    },
  },
  {
    id: 'ALR-0928-010',
    severity: 'low',
    confidence: 'medium',
    status: 'rejected',
    topic: 'inventory',
    typeLabel: { es: 'Sobrestock', en: 'Overstock' },
    entityLabel: { es: 'Atún en lata 170 g · CEDI Medellín', en: 'Canned tuna 170 g · Medellín DC' },
    headline: {
      es: 'El atún en lata 170 g acumula 62 días de inventario en el CEDI Medellín',
      en: 'Canned tuna 170 g has piled up 62 days of inventory at the Medellín DC',
    },
    description: {
      es: 'Exceso de existencias en bodega tras una compra anticipada. Se rechazó la promoción propuesta porque la temporada alta empieza en noviembre.',
      en: 'Excess warehouse stock after an early purchase. The proposed promotion was rejected because the high season starts in November.',
    },
    amountAtRisk: 12_100_000,
    createdAt: '2026-09-28T11:00:00-05:00',
    agent: null,
    series: {
      label: COVERAGE,
      unit: 'days',
      values: [38, 40, 41, 43, 45, 47, 48, 50, 53, 55, 57, 59, 60, 62],
      threshold: 45,
      thresholdType: 'max',
      summary: { es: 'Cobertura: subió de 38 a 62 días; el máximo es 45', en: 'Coverage: rose from 38 to 62 days; the maximum is 45' },
    },
  },
  {
    id: 'ALR-0927-002',
    severity: 'high',
    confidence: 'high',
    status: 'executed',
    topic: 'receivables',
    typeLabel: OVERDUE,
    entityLabel: { es: 'Tienda Don Pepe · Bogotá', en: 'Tienda Don Pepe · Bogotá' },
    headline: {
      es: 'Se bloqueó el crédito de Tienda Don Pepe tras 52 días sin pagar',
      en: 'Tienda Don Pepe’s credit was blocked after 52 days without paying',
    },
    description: {
      es: 'El bloqueo de cupo se ejecutó el 28 sep. El cliente firmó un acuerdo de pago a 3 cuotas.',
      en: 'The credit block was executed on Sep 28. The customer signed a 3-installment payment agreement.',
    },
    amountAtRisk: 95_000_000,
    createdAt: '2026-09-27T16:30:00-05:00',
    agent: null,
    series: {
      label: DAYS_OVERDUE,
      unit: '',
      values: [20, 23, 26, 28, 31, 34, 36, 39, 41, 44, 46, 48, 50, 52],
      threshold: 30,
      thresholdType: 'max',
      summary: { es: 'Días de mora: subieron de 20 a 52; el máximo es 30', en: 'Days overdue: rose from 20 to 52; the maximum is 30' },
    },
  },
]

export interface Template {
  severity: Severity
  confidence: Confidence
  topic: Topic
  typeLabel: Localized
  entityLabel: Localized
  headline: Localized
  description: Localized
  amountAtRisk: number
  focus: Localized
  series: SeriesRecord
}

export const TEMPLATES: Template[] = [
  {
    severity: 'critical',
    confidence: 'high',
    topic: 'inventory',
    typeLabel: STOCKOUT,
    entityLabel: { es: 'Arroz 5 kg · CEDI Medellín', en: 'Rice 5 kg · Medellín DC' },
    headline: {
      es: 'El arroz 5 kg se agota en el CEDI Medellín en 3 días y la próxima entrega llega en 9',
      en: 'Rice 5 kg runs out at the Medellín DC in 3 days and the next delivery arrives in 9',
    },
    description: {
      es: 'Faltante de stock por un retraso del proveedor. Hay existencias disponibles en el CEDI Bogotá.',
      en: 'Stock shortage because of a supplier delay. There is stock available at the Bogotá DC.',
    },
    amountAtRisk: 412_000_000,
    focus: { es: 'existencias por CEDI', en: 'stock by DC' },
    series: {
      label: COVERAGE,
      unit: 'days',
      values: [12.4, 11.8, 11.1, 10.2, 9.5, 8.7, 7.9, 7.0, 6.2, 5.5, 4.8, 4.1, 3.5, 3.0],
      threshold: 10,
      thresholdType: 'min',
      summary: { es: 'Cobertura: bajó de 12,4 a 3 días; el mínimo es 10', en: 'Coverage: fell from 12.4 to 3 days; the minimum is 10' },
    },
  },
  {
    severity: 'high',
    confidence: 'medium',
    topic: 'receivables',
    typeLabel: OVERDUE,
    entityLabel: { es: 'Supermercado La Economía · Medellín', en: 'Supermercado La Economía · Medellín' },
    headline: {
      es: 'Supermercado La Economía no paga 2 facturas y pidió ampliar su cupo de crédito',
      en: 'Supermercado La Economía is not paying 2 invoices and asked for a higher credit line',
    },
    description: {
      es: 'El cliente acumula deuda vencida de 38 días y solicitó más crédito para la temporada.',
      en: 'The customer has 38 days of overdue debt and requested more credit for the season.',
    },
    amountAtRisk: 133_500_000,
    focus: { es: 'historial de pagos del cliente', en: 'the customer’s payment history' },
    series: {
      label: DAYS_OVERDUE,
      unit: '',
      values: [5, 7, 9, 12, 14, 17, 19, 22, 25, 27, 30, 33, 35, 38],
      threshold: 30,
      thresholdType: 'max',
      summary: { es: 'Días de mora: subieron de 5 a 38; el máximo es 30', en: 'Days overdue: rose from 5 to 38; the maximum is 30' },
    },
  },
  {
    severity: 'medium',
    confidence: 'medium',
    topic: 'margin',
    typeLabel: LOW_MARGIN,
    entityLabel: { es: 'Café molido 500 g · Región Centro', en: 'Ground coffee 500 g · Central Region' },
    headline: {
      es: 'El margen del café molido 500 g bajó a 18,9% por el alza del costo del grano',
      en: 'The ground coffee 500 g margin fell to 18.9% because of the rising bean cost',
    },
    description: {
      es: 'El costo de compra subió 9% y el precio de venta no se ha ajustado. Rentabilidad bajo la política de 20%.',
      en: 'The purchase cost rose 9% and the sale price has not been adjusted. Profitability is below the 20% policy.',
    },
    amountAtRisk: 57_300_000,
    focus: { es: 'costos y precios de lista', en: 'costs and list prices' },
    series: {
      label: GROSS_MARGIN,
      unit: '%',
      values: [22.6, 22.4, 22.1, 21.8, 21.4, 21.0, 20.7, 20.4, 20.1, 19.8, 19.5, 19.3, 19.1, 18.9],
      threshold: 20,
      thresholdType: 'min',
      summary: { es: 'Margen bruto: bajó de 22,6% a 18,9%; el mínimo es 20%', en: 'Gross margin: fell from 22.6% to 18.9%; the minimum is 20%' },
    },
  },
  {
    severity: 'low',
    confidence: 'low',
    topic: 'returns',
    typeLabel: RETURNS,
    entityLabel: { es: 'Ruta 4 · Cali', en: 'Route 4 · Cali' },
    headline: {
      es: 'Las devoluciones de la ruta 4 en Cali subieron a 3,2% por producto averiado',
      en: 'Returns on route 4 in Cali rose to 3.2% because of damaged product',
    },
    description: {
      es: 'Los reclamos se concentran en empaques golpeados durante el transporte.',
      en: 'Complaints are concentrated on packaging damaged during transport.',
    },
    amountAtRisk: 6_900_000,
    focus: { es: 'devoluciones por motivo y por cliente', en: 'returns by reason and by customer' },
    series: {
      label: RETURNS,
      unit: '%',
      values: [2.2, 2.3, 2.2, 2.4, 2.5, 2.4, 2.6, 2.7, 2.8, 2.9, 3.0, 3.0, 3.1, 3.2],
      threshold: 3,
      thresholdType: 'max',
      summary: { es: 'Devoluciones: subieron de 2,2% a 3,2%; el máximo es 3%', en: 'Returns: rose from 2.2% to 3.2%; the maximum is 3%' },
    },
  },
  {
    severity: 'high',
    confidence: 'high',
    topic: 'sales',
    typeLabel: SALES_DROP,
    entityLabel: { es: 'Bebidas en lata · Canal tradicional Bogotá', en: 'Canned drinks · Bogotá traditional channel' },
    headline: {
      es: 'La venta de bebidas en lata en tiendas de Bogotá cayó 24% en dos semanas',
      en: 'Canned drink sales in Bogotá stores fell 24% in two weeks',
    },
    description: {
      es: 'Menos pedidos en tiendas de barrio; un competidor lanzó promoción 2x1 en la zona norte.',
      en: 'Fewer orders from neighborhood stores; a competitor launched a 2-for-1 promotion in the north.',
    },
    amountAtRisk: 221_800_000,
    focus: { es: 'pedidos por zona y por tienda', en: 'orders by zone and by store' },
    series: {
      label: UNITS_PER_DAY,
      unit: '',
      values: [1840, 1810, 1790, 1720, 1680, 1640, 1600, 1560, 1530, 1490, 1460, 1440, 1420, 1398],
      threshold: 1650,
      thresholdType: 'min',
      summary: {
        es: 'Unidades por día: bajaron de 1.840 a 1.398; el mínimo esperado es 1.650',
        en: 'Units per day: fell from 1,840 to 1,398; the expected minimum is 1,650',
      },
    },
  },
  {
    severity: 'critical',
    confidence: 'medium',
    topic: 'receivables',
    typeLabel: { es: 'Riesgo de impago', en: 'Default risk' },
    entityLabel: { es: 'Distribuidora Caribe · Barranquilla', en: 'Distribuidora Caribe · Barranquilla' },
    headline: {
      es: 'Distribuidora Caribe dejó de pagar y concentra el 14% de la cartera de la Costa',
      en: 'Distribuidora Caribe stopped paying and holds 14% of the Coast’s receivables',
    },
    description: {
      es: 'Tres cheques devueltos esta semana. El cliente tiene pedidos en tránsito a crédito.',
      en: 'Three bounced checks this week. The customer has credit orders in transit.',
    },
    amountAtRisk: 498_600_000,
    focus: { es: 'exposición de crédito y pedidos en tránsito', en: 'credit exposure and orders in transit' },
    series: {
      label: DAYS_OVERDUE,
      unit: '',
      values: [0, 3, 6, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35, 39],
      threshold: 30,
      thresholdType: 'max',
      summary: { es: 'Días de mora: subieron de 0 a 39; el máximo es 30', en: 'Days overdue: rose from 0 to 39; the maximum is 30' },
    },
  },
]
