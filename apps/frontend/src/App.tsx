import { useCallback, useEffect, useRef, useState } from 'react'
import { decide, fetchAlerts, fetchEvents, fetchSummary, simulateAlert, type Filters } from './api.ts'
import { AlertCard } from './components/AlertCard.tsx'
import { AlertDetail } from './components/detail/AlertDetail.tsx'
import { History } from './components/History.tsx'
import { FlaskIcon, Logo, SeverityIcon } from './components/Icons.tsx'
import { SearchBar } from './components/SearchBar.tsx'
import { Toasts, type Toast } from './components/Toasts.tsx'
import { FILTER_KEYS, LANGS, SEVERITIES, type AlertEvent, type AlertResult, type AlertsResponse, type Summary } from './domain.ts'
import { useI18n } from './i18n/context.ts'

const INITIAL_FILTERS: Filters = {
  view: 'pending',
  q: '',
  topic: { values: [], op: 'is' },
  status: { values: [], op: 'is' },
  priority: { values: [], op: 'is' },
  sort: 'amount',
}

const EVENTS_INTERVAL_MS = 2500
const TOAST_DURATION_MS = 7000

interface List {
  resp: AlertsResponse | null
  seq: number
}

type Route = { page: 'inbox' } | { page: 'history' } | { page: 'alert'; id: string }

const readRoute = (): Route => {
  const hash = window.location.hash
  if (hash === '#/history') return { page: 'history' }
  const m = hash.match(/^#\/alert\/(.+)$/)
  return m ? { page: 'alert', id: decodeURIComponent(m[1]) } : { page: 'inbox' }
}

function useRoute() {
  const [route, setRoute] = useState(readRoute)
  useEffect(() => {
    const onChange = () => {
      setRoute(readRoute())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

const alertRoute = (id: string) => `#/alert/${encodeURIComponent(id)}`

export default function App() {
  const { lang, setLang, t, fmt } = useI18n()
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS)
  const [search, setSearch] = useState('')
  const [list, setList] = useState<List>({ resp: null, seq: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [version, setVersion] = useState(0)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [simulating, setSimulating] = useState(false)
  const route = useRoute()
  const openAlert = route.page === 'alert' ? route.id : null

  const [today] = useState(() => new Date())

  const refresh = useCallback(() => setVersion((v) => v + 1), [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((f) => {
        if (f.q === search) return f
        const sort = search.trim() && !f.q.trim() ? 'relevance' : !search.trim() && f.sort === 'relevance' ? 'amount' : f.sort
        return { ...f, q: search, sort }
      })
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    const ctrl = new AbortController()
    setLoading(true)
    fetchAlerts(filters, ctrl.signal)
      .then((resp) => {
        setList((l) => ({ resp, seq: l.seq + 1 }))
        setError(null)
      })
      .catch((e: unknown) => {
        if (!ctrl.signal.aborted) setError(e instanceof Error ? e.message : t.inbox.loadFailed)
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false)
      })
    return () => ctrl.abort()
  }, [filters, version, t])

  useEffect(() => {
    const ctrl = new AbortController()
    fetchSummary(ctrl.signal).then(setSummary).catch(() => {})
    return () => ctrl.abort()
  }, [version])

  const closeToast = useCallback((id: number) => setToasts((a) => a.filter((x) => x.id !== id)), [])

  const notify = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = Date.now() + Math.random()
      setToasts((a) => [...a.slice(-3), { ...toast, id }])
      setTimeout(() => closeToast(id), TOAST_DURATION_MS)
    },
    [closeToast],
  )

  const viewAlert = useCallback((id: string) => {
    window.location.hash = alertRoute(id)
  }, [])

  const announce = useCallback(
    (ev: AlertEvent) => {
      const a = ev.alert
      const title = ev.type === 'new' ? t.events.newAlert(t.severity[a.severity].toLowerCase(), a.typeLabel) : t.events.readyAlert(a.typeLabel)
      notify({ tone: a.severity, title, text: a.headline, alertId: a.id })
      if ('Notification' in window && Notification.permission === 'granted') {
        const n = new Notification(`Centinela · ${title}`, { body: a.headline, tag: `${a.id}-${ev.type}` })
        n.onclick = () => {
          window.focus()
          viewAlert(a.id)
        }
      }
    },
    [notify, viewAlert, t],
  )

  const lastEvent = useRef<number | null>(null)
  const revision = useRef<number | null>(null)
  const checkEvents = useCallback(async () => {
    try {
      const r = await fetchEvents(lastEvent.current)
      if (lastEvent.current !== null) r.events.forEach(announce)
      lastEvent.current = r.last
      if (revision.current !== null && revision.current !== r.revision) refresh()
      revision.current = r.revision
    } catch {
    }
  }, [announce, refresh])

  useEffect(() => {
    checkEvents()
    const timer = setInterval(checkEvents, EVENTS_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [checkEvents])

  useEffect(() => {
    document.title = summary?.pending ? `(${summary.pending}) ${t.app.docTitle}` : t.app.docTitle
  }, [summary?.pending, t])

  async function simulate() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }
    setSimulating(true)
    try {
      await simulateAlert()
      await checkEvents()
    } catch (e) {
      notify({ tone: 'error', title: t.header.simulateFailed, text: e instanceof Error ? e.message : '' })
    } finally {
      setSimulating(false)
    }
  }

  async function onDecide(a: AlertResult, action: 'approve' | 'reject') {
    setBusy(a.id)
    try {
      await decide(a.id, action)
      notify({ tone: 'ok', title: action === 'approve' ? t.inbox.approved : t.inbox.rejected, text: a.headline })
      refresh()
    } catch (e) {
      notify({ tone: 'error', title: t.inbox.decisionFailed, text: e instanceof Error ? e.message : '' })
    } finally {
      setBusy(null)
    }
  }

  const alerts = list.resp?.alerts ?? []
  const hasFilters = filters.q.trim() !== '' || FILTER_KEYS.some((k) => filters[k].values.length > 0)
  const resultLine = list.resp
    ? hasFilters
      ? t.inbox.resultFiltered(list.resp.total, t.inbox.viewCount[filters.view](list.resp.viewTotal))
      : t.inbox.resultAll(t.inbox.viewCount[filters.view](list.resp.viewTotal), t.inbox.sortedBy[filters.sort])
    : ''

  return (
    <div className="app">
      <header className="header">
        <span className="brand">
          <Logo />
          Centinela
        </span>
        {openAlert ? (
          <nav aria-label={t.nav.breadcrumb} className="breadcrumbs">
            <a href="#/">{t.nav.inbox}</a>
            <span aria-hidden="true">/</span>
            <span aria-current="page" className="breadcrumbs-id">{openAlert}</span>
          </nav>
        ) : (
          <nav aria-label={t.nav.main} className="nav">
            <a href="#/" className={`nav-item${route.page === 'inbox' ? ' nav-item--active' : ''}`} aria-current={route.page === 'inbox' ? 'page' : undefined}>
              {t.nav.inbox} {summary && <span className="counter">{summary.pending}</span>}
            </a>
            <a href="#/history" className={`nav-item${route.page === 'history' ? ' nav-item--active' : ''}`} aria-current={route.page === 'history' ? 'page' : undefined}>
              {t.nav.history}
            </a>
          </nav>
        )}
        <div className="header-right">
          <span className="agents-status">
            <span className="dot-ok" aria-hidden="true" />
            {t.header.agentsActive}
            {summary && ` · ${t.header.lastCheck(fmt.time(summary.lastCheck))}`}
          </span>
          <div role="group" aria-label={t.header.language} className="lang-switch">
            {LANGS.map((l) => (
              <button key={l} type="button" aria-pressed={l === lang} lang={l} title={t.header.languageNames[l]} onClick={() => setLang(l)}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn--test" onClick={simulate} disabled={simulating}>
            <FlaskIcon />
            {simulating ? t.header.simulating : t.header.simulate}
          </button>
        </div>
      </header>

      {openAlert ? (
        <AlertDetail key={openAlert} id={openAlert} version={version} notify={notify} onChange={refresh} />
      ) : route.page === 'history' ? (
        <History />
      ) : (
        <main className="content">
          <div className="page-head">
            <div>
              <h1>{t.inbox.title}</h1>
              <p className="subtitle">
                {fmt.longDate(today)}
                {summary && (
                  <>
                    {' · '}
                    {t.inbox.subtitle(summary.ready, summary.inProgress)}
                  </>
                )}
              </p>
            </div>
            <div className="risk">
              <div>
                <div className="risk-label">{t.inbox.atRiskThisMonth}</div>
                <div className="risk-value">{summary ? fmt.money(summary.amountAtRisk) : '—'}</div>
              </div>
              <ul aria-label={t.inbox.pendingByPriority} className="risk-sev">
                {SEVERITIES.map((s) => (
                  <li key={s} style={{ color: `var(--${s})` }}>
                    <SeverityIcon severity={s} withMark={false} />
                    {summary?.bySeverity[s] ?? 0} {t.severity[s].toLowerCase()}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="search-block">
            <SearchBar search={search} onSearch={setSearch} filters={filters} onFilters={setFilters} facets={list.resp?.facets ?? null} />
            <p className="result-line" role="status">
              {resultLine}
            </p>
          </div>

          {error ? (
            <div className="empty" role="alert">
              <h2>{t.inbox.errorTitle}</h2>
              <p>{error}</p>
              <button type="button" className="btn btn--primary" onClick={refresh}>
                {t.common.retry}
              </button>
            </div>
          ) : !list.resp ? (
            <ul className="list" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <li key={i} className="card card--skeleton" />
              ))}
            </ul>
          ) : alerts.length === 0 ? (
            <div className="empty">
              {hasFilters ? (
                <>
                  <h2>{t.inbox.noMatchesTitle}</h2>
                  <p>{t.inbox.noMatchesText}</p>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      setSearch('')
                      setFilters({ ...INITIAL_FILTERS, view: filters.view })
                    }}
                  >
                    {t.inbox.clearFilters}
                  </button>
                </>
              ) : (
                <>
                  <h2>{t.inbox.emptyTitle}</h2>
                  <p>{t.inbox.emptyText}</p>
                </>
              )}
            </div>
          ) : (
            <ul className={`list${loading ? ' list--loading' : ''}`} aria-label={t.inbox.alertsLabel} aria-busy={loading}>
              {alerts.map((a) => (
                <li key={a.id}>
                  <AlertCard alert={a} busy={busy === a.id} onDecide={onDecide} />
                </li>
              ))}
            </ul>
          )}
        </main>
      )}

      <Toasts toasts={toasts} onClose={closeToast} onView={viewAlert} />
    </div>
  )
}
