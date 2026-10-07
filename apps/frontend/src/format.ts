import type { Lang, Series } from './domain.ts'

export const LOCALE: Record<Lang, string> = { es: 'es-CO', en: 'en-US' }

const MONTHS: Record<Lang, string[]> = {
  es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
}

const DAYS: Record<Lang, string[]> = {
  es: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
}

export const formatNumber = (value: number, lang: Lang): string => value.toLocaleString(LOCALE[lang], { maximumFractionDigits: 1 })

export function formatMoney(value: number, lang: Lang): string {
  const millions = (value / 1_000_000).toLocaleString(LOCALE[lang], { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  return lang === 'es' ? `$${millions} M` : `$${millions}M`
}

export function formatShortDate(iso: string | Date, lang: Lang): string {
  const d = new Date(iso)
  const month = MONTHS[lang][d.getMonth()]
  return lang === 'es' ? `${d.getDate()} ${month}` : `${month} ${d.getDate()}`
}

export function formatDate(iso: string | Date, lang: Lang): string {
  const d = new Date(iso)
  return lang === 'es' ? `${formatShortDate(d, lang)} ${d.getFullYear()}` : `${formatShortDate(d, lang)}, ${d.getFullYear()}`
}

export function formatLongDate(d: Date, lang: Lang): string {
  return lang === 'es' ? `${DAYS.es[d.getDay()]} ${formatDate(d, lang)}` : `${DAYS.en[d.getDay()]}, ${formatDate(d, lang)}`
}

export function formatTime(iso: string | Date, lang: Lang): string {
  const d = new Date(iso)
  const h = d.getHours()
  const m = String(d.getMinutes()).padStart(2, '0')
  const suffix = lang === 'es' ? (h < 12 ? 'a. m.' : 'p. m.') : h < 12 ? 'AM' : 'PM'
  return `${h % 12 || 12}:${m} ${suffix}`
}

export function formatValue(value: number, unit: Series['unit'], lang: Lang): string {
  const n = formatNumber(value, lang)
  if (unit === '%') return `${n}%`
  if (unit === 'days') return lang === 'es' ? `${n} días` : `${n} days`
  return n
}
