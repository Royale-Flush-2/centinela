import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { setApiLanguage } from '../api.ts'
import { LANGS, type Lang } from '../domain.ts'
import { I18nContext, formatters } from './context.ts'
import { en } from './en.ts'
import { es, type Messages } from './es.ts'

const MESSAGES: Record<Lang, Messages> = { es, en }
const STORAGE_KEY = 'centinela.lang'
const DEFAULT_LANG: Lang = 'es'

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (LANGS.includes(saved as Lang)) return saved as Lang
  } catch {
  }
  return DEFAULT_LANG
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const l = initialLang()
    setApiLanguage(l)
    return l
  })

  const setLang = useCallback((l: Lang) => {
    setApiLanguage(l)
    setLangState(l)
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang
    try {
      localStorage.setItem(STORAGE_KEY, lang)
    } catch {
    }
  }, [lang])

  const value = useMemo(() => ({ lang, setLang, t: MESSAGES[lang], fmt: formatters(lang) }), [lang, setLang])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
