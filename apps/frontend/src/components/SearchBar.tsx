import { Fragment, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { Filters } from '../api.ts'
import {
  FILTER_KEYS,
  SEVERITIES,
  TOPICS,
  VIEWS,
  VIEW_STATUSES,
  type AlertsResponse,
  type FieldFilter,
  type FilterKey,
  type Operator,
  type SortOrder,
  type View,
} from '../domain.ts'
import { useI18n } from '../i18n/context.ts'
import type { Suggestion } from '../i18n/es.ts'
import { CloseIcon, SearchIcon, SparkleIcon } from './Icons.tsx'

const SORTS: SortOrder[] = ['relevance', 'amount', 'severity', 'recent']

type Item =
  | { kind: 'search' }
  | { kind: 'suggestion'; s: Suggestion }
  | { kind: 'filter'; k: FilterKey }
  | { kind: 'value'; value: string; label: string; count?: number }
  | { kind: 'op'; op: Operator }

interface Option {
  value: string
  label: string
  count: number
}

const stripAccents = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

interface Props {
  search: string
  onSearch: (value: string) => void
  filters: Filters
  onFilters: (filters: Filters) => void
  facets: AlertsResponse['facets'] | null
}

export function SearchBar({ search, onSearch, filters, onFilters, facets }: Props) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<FilterKey | null>(null)
  const [optionText, setOptionText] = useState('')
  const [active, setActive] = useState(0)
  const zone = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)

  const labelOf = (k: FilterKey, value: string): string =>
    k === 'topic' ? t.topic[value as keyof typeof t.topic] : k === 'status' ? t.status[value as keyof typeof t.status] : t.severity[value as keyof typeof t.severity]

  const options = (k: FilterKey): Option[] => {
    const values: readonly string[] = k === 'topic' ? TOPICS : k === 'priority' ? SEVERITIES : VIEW_STATUSES[filters.view]
    const counts = facets ? new Map<string, number>(facets[k].map((f) => [f.value, f.count])) : null
    return values.map((value) => ({ value, label: labelOf(k, value), count: counts?.get(value) ?? 0 }))
  }

  const valuesSummary = (k: FilterKey) => {
    const labels = options(k)
      .filter((f) => (filters[k].values as string[]).includes(f.value))
      .map((f) => f.label)
    return labels.length > 2 ? `${labels.slice(0, 2).join(', ')} +${labels.length - 2}` : labels.join(', ')
  }

  const change = (k: FilterKey, field: FieldFilter<string>) => onFilters({ ...filters, [k]: field } as Filters)

  const items: Item[] = editing
    ? [
        ...options(editing)
          .filter((f) => stripAccents(f.label).includes(stripAccents(optionText.trim())))
          .map((f): Item => ({ kind: 'value', value: f.value, label: f.label, count: facets ? f.count : undefined })),
        { kind: 'op', op: 'is' },
        { kind: 'op', op: 'is_not' },
      ]
    : [
        ...(search.trim() ? [{ kind: 'search' } as Item] : t.search.suggestions.map((s): Item => ({ kind: 'suggestion', s }))),
        ...FILTER_KEYS.map((k): Item => ({ kind: 'filter', k })),
      ]
  const index = Math.min(active, items.length - 1)

  const finishEditing = () => {
    if (editing && filters[editing].values.length === 0 && filters[editing].op !== 'is') change(editing, { values: [], op: 'is' })
    setEditing(null)
    setOptionText('')
    setActive(0)
  }

  const close = () => {
    finishEditing()
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return
    const outside = (e: MouseEvent) => {
      if (zone.current && !zone.current.contains(e.target as Node)) close()
    }
    document.addEventListener('mousedown', outside)
    return () => document.removeEventListener('mousedown', outside)
  })

  const edit = (k: FilterKey) => {
    setEditing(k)
    setOptionText('')
    setActive(0)
    setOpen(true)
    input.current?.focus()
  }

  const remove = (k: FilterKey) => {
    change(k, { values: [], op: 'is' })
    if (editing === k) finishEditing()
  }

  const clearAll = () => {
    onSearch('')
    onFilters({
      ...filters,
      q: '',
      topic: { values: [], op: 'is' },
      status: { values: [], op: 'is' },
      priority: { values: [], op: 'is' },
      sort: filters.sort === 'relevance' ? 'amount' : filters.sort,
    })
    finishEditing()
    input.current?.focus()
  }

  const run = (item: Item) => {
    switch (item.kind) {
      case 'search':
        setOpen(false)
        break
      case 'suggestion':
        onSearch(item.s.q ?? '')
        onFilters({ ...filters, ...item.s.filters })
        setOpen(false)
        break
      case 'filter':
        edit(item.k)
        break
      case 'value': {
        if (!editing) break
        const current = filters[editing].values as string[]
        const values = current.includes(item.value) ? current.filter((v) => v !== item.value) : [...current, item.value]
        change(editing, { ...filters[editing], values })
        setOptionText('')
        break
      }
      case 'op':
        if (editing) change(editing, { ...filters[editing], op: item.op })
        break
    }
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const empty = e.currentTarget.value === ''
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) return setOpen(true)
      const step = e.key === 'ArrowDown' ? 1 : -1
      setActive((index + step + items.length) % items.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (!open) return setOpen(true)
      if (items[index]) run(items[index])
    } else if (e.key === 'Escape') {
      if (editing) finishEditing()
      else setOpen(false)
    } else if (e.key === 'Backspace' && empty) {
      if (editing) {
        e.preventDefault()
        remove(editing)
      } else {
        const last = [...FILTER_KEYS].reverse().find((k) => filters[k].values.length > 0)
        if (last) remove(last)
      }
    }
  }

  const applied = FILTER_KEYS.filter((k) => filters[k].values.length > 0 && k !== editing)
  const hasAnything = applied.length > 0 || search.trim() !== '' || editing !== null

  const placeholder = editing ? t.search.choose(t.search.field[editing].toLowerCase()) : applied.length ? t.search.placeholderMore : t.search.placeholder

  const header = (item: Item, previous?: Item): string | null => {
    if (previous?.kind === item.kind) return null
    if (item.kind === 'suggestion') return t.search.suggested
    if (item.kind === 'filter') return t.search.filterBy
    return null
  }

  const itemContent = (item: Item, selected: boolean) => {
    switch (item.kind) {
      case 'search':
        return (
          <>
            <span className="option-icon option-icon--accent"><SparkleIcon /></span>
            <span className="option-text">{t.search.searchByMeaning(search.trim())}</span>
          </>
        )
      case 'suggestion':
        return (
          <>
            <span className="option-icon option-icon--accent"><SparkleIcon /></span>
            <span className="option-text">{item.s.text}</span>
          </>
        )
      case 'filter': {
        const n = filters[item.k].values.length
        return (
          <>
            <span className="option-text">{t.search.field[item.k]}</span>
            {n > 0 && <span className="option-note">{t.search.applied(n)}</span>}
          </>
        )
      }
      case 'value': {
        const checked = editing !== null && (filters[editing].values as string[]).includes(item.value)
        return (
          <>
            <span className="option-check">{checked && <Check />}</span>
            <span className="option-text">{item.label}</span>
            {item.count !== undefined && !selected && <span className="option-note">{item.count}</span>}
          </>
        )
      }
      case 'op': {
        const checked = editing !== null && filters[editing].op === item.op
        return (
          <>
            <span className="option-check">{checked && <Check />}</span>
            <span className="option-text">{t.search.opTitle[item.op]}</span>
          </>
        )
      }
    }
  }

  const noMatches = editing !== null && items.every((i) => i.kind === 'op')

  return (
    <section className="search" ref={zone} aria-label={t.search.label}>
      <div className="search-row">
        <label htmlFor="view" className="sr-only">{t.search.view}</label>
        <select id="view" className="view-select" value={filters.view} onChange={(e) => onFilters({ ...filters, view: e.target.value as View, status: { values: [], op: 'is' } })}>
          {VIEWS.map((v) => (
            <option key={v} value={v}>
              {t.view[v]}
            </option>
          ))}
        </select>

        <div
          className={`combo${open ? ' combo--open' : ''}`}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              e.preventDefault()
              input.current?.focus()
            }
          }}
        >
          <span className="combo-icon"><SearchIcon /></span>
          {editing && search.trim() && (
            <span className="token token--q"><SparkleIcon />«{search.trim()}»</span>
          )}
          {applied.map((k) => (
            <span key={k} className="token">
              <button type="button" className="token-text" onClick={() => edit(k)} aria-label={t.search.editFilter(t.search.field[k])}>
                <span className="token-field">{t.search.field[k]}</span> {t.search.op[filters[k].op]} {valuesSummary(k)}
              </button>
              <button type="button" className="token-remove" aria-label={t.search.removeFilter(t.search.field[k])} onClick={() => remove(k)}>
                <CloseIcon size={11} />
              </button>
            </span>
          ))}
          {editing && (
            <span className="token token--draft">
              <span className="token-field">{t.search.field[editing]}</span> {t.search.op[filters[editing].op]}
              {filters[editing].values.length > 0 && <> {valuesSummary(editing)}</>}
            </span>
          )}
          <label htmlFor="search" className="sr-only">{t.search.inputLabel}</label>
          <input
            ref={input}
            id="search"
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls="search-options"
            aria-autocomplete="list"
            aria-activedescendant={open && items.length ? `search-option-${index}` : undefined}
            autoComplete="off"
            value={editing ? optionText : search}
            placeholder={placeholder}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              if (editing) setOptionText(e.target.value)
              else onSearch(e.target.value)
              setActive(0)
              setOpen(true)
            }}
            onKeyDown={onKeyDown}
          />
          {hasAnything && (
            <button type="button" className="combo-clear" aria-label={t.search.clearAll} onClick={clearAll}>
              <CloseIcon size={12} />
            </button>
          )}
        </div>

        <label htmlFor="sort" className="sr-only">{t.search.sortBy}</label>
        <select id="sort" className="sort-select" value={filters.sort} onChange={(e) => onFilters({ ...filters, sort: e.target.value as SortOrder })}>
          {SORTS.filter((s) => s !== 'relevance' || search.trim()).map((s) => (
            <option key={s} value={s}>
              {t.search.sort[s]}
            </option>
          ))}
        </select>
      </div>

      {open && (
        <div className="dropdown" id="search-options" role="listbox" aria-label={editing ? t.search.optionsFor(t.search.field[editing]) : t.search.suggestionsAndFilters}>
          {noMatches && <div className="dropdown-empty">{t.search.noOptions(optionText)}</div>}
          {items.map((item, i) => {
            const title = header(item, items[i - 1])
            const separate = i > 0 && items[i - 1].kind !== item.kind
            const selected = i === index
            return (
              <Fragment key={i}>
                {separate && <div className="dropdown-sep" role="separator" />}
                {title && <div className="dropdown-title">{title}</div>}
                <div
                  id={`search-option-${i}`}
                  role="option"
                  aria-selected={selected}
                  className={`option${selected ? ' option--active' : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseMove={() => i !== index && setActive(i)}
                  onClick={() => run(item)}
                >
                  {itemContent(item, selected)}
                  {selected && (
                    <kbd className="option-enter" aria-hidden="true">
                      <svg width="12" height="12" viewBox="0 0 16 16"><path d="M13 3v5a2 2 0 0 1-2 2H3m3-3L3 10l3 3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      Enter
                    </kbd>
                  )}
                </div>
              </Fragment>
            )
          })}
        </div>
      )}
    </section>
  )
}

const Check = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
