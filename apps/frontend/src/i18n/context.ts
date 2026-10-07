import { createContext, useContext } from 'react'
import type { Lang, Series } from '../domain.ts'
import { formatDate, formatLongDate, formatMoney, formatNumber, formatShortDate, formatTime, formatValue } from '../format.ts'
import type { Messages } from './es.ts'

export function formatters(lang: Lang) {
  return {
    money: (v: number) => formatMoney(v, lang),
    number: (v: number) => formatNumber(v, lang),
    date: (d: string | Date) => formatDate(d, lang),
    shortDate: (d: string | Date) => formatShortDate(d, lang),
    longDate: (d: Date) => formatLongDate(d, lang),
    time: (d: string | Date) => formatTime(d, lang),
    value: (v: number, unit: Series['unit']) => formatValue(v, unit, lang),
  }
}

export interface I18n {
  lang: Lang
  setLang: (lang: Lang) => void
  t: Messages
  fmt: ReturnType<typeof formatters>
}

export const I18nContext = createContext<I18n | null>(null)

export function useI18n(): I18n {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>')
  return ctx
}
