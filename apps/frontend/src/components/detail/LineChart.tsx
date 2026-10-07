import type { ChartData } from '../../detail.ts'
import { useI18n } from '../../i18n/context.ts'

const W = 760
const H = 260
const LEFT = 48
const RIGHT = 740
const TOP = 20
const BOTTOM = 220

const STYLES = [
  { color: 'var(--ac)', dash: undefined },
  { color: 'var(--critical)', dash: '6 4' },
  { color: 'var(--ok)', dash: undefined },
  { color: 'var(--mu)', dash: '2 3' },
]

const stripAccents = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()

function ceiling(v: number) {
  if (v <= 0) return 1
  const step = 10 ** Math.floor(Math.log10(v))
  return Math.ceil(v / step) * step
}

export function LineChart({ data: d }: { data: ChartData }) {
  const { t, fmt } = useI18n()
  const rows = d.data?.rows ?? []
  const series = d.series ?? {}
  const keys = Object.keys(series)
  const n = rows.length
  if (n < 2 || keys.length === 0) return null

  const values = rows.flatMap((r) => keys.map((k) => r[k])).filter((v): v is number => typeof v === 'number')
  const max = ceiling(Math.max(...values, d.threshold ?? 0) * 1.05)
  const min = Math.min(0, ...values)
  const x = (i: number) => LEFT + (i * (RIGHT - LEFT)) / (n - 1)
  const y = (v: number) => BOTTOM - ((v - min) / (max - min)) * (BOTTOM - TOP)
  const indexOf = (date: string) => rows.findIndex((r) => stripAccents(String(r.date)) === stripAccents(date))

  const segments = (k: string) => {
    const list: string[][] = []
    let current: string[] = []
    rows.forEach((r, i) => {
      const v = r[k]
      if (typeof v === 'number') current.push(`${x(i).toFixed(1)},${y(v).toFixed(1)}`)
      else if (current.length) {
        list.push(current)
        current = []
      }
    })
    if (current.length) list.push(current)
    return list
  }

  const iToday = d.today ? indexOf(d.today) : -1
  const xLabels = [...new Set([0, iToday > 0 ? Math.round(iToday / 2) : -1, iToday, n - 1])].filter((i) => i >= 0)
  const ticks = [0, 1, 2, 3, 4].map((tick) => min + ((max - min) * tick) / 4)

  const annotations = (d.annotations ?? []).map((a) => {
    const [dates, ...rest] = a.split(':')
    const text = rest.join(':').trim()
    const [from, to] = dates.split(/\s+[–-]\s+/)
    return { from: indexOf(from ?? ''), to: to ? indexOf(to) : -1, text }
  })
  const lastSeries = keys[keys.length - 1]

  const actual = keys[0]
  const withValue = rows.filter((r) => typeof r[actual] === 'number')
  const title = d.title ?? t.chart.fallbackTitle
  const aria =
    withValue.length >= 2
      ? t.chart.aria({
          title,
          series: series[actual].toLowerCase(),
          from: fmt.number(withValue[0][actual] as number),
          fromDate: String(withValue[0].date),
          to: fmt.number(withValue[withValue.length - 1][actual] as number),
          toDate: String(withValue[withValue.length - 1].date),
          unit: d.unit,
        }) +
        (d.threshold != null ? ` ${d.threshold_label ?? t.chart.threshold(fmt.number(d.threshold))}.` : '') +
        (d.annotations?.length ? ` ${d.annotations.join('. ')}.` : '')
      : title

  return (
    <figure className="detail-card detail-chart">
      <figcaption>
        {d.title && <span className="detail-chart-title">{d.title}</span>}
        <span className="detail-legend">
          {keys.map((k, i) => (
            <span key={k}>
              <svg width="18" height="8" aria-hidden="true">
                <line x1="0" y1="4" x2="18" y2="4" style={{ stroke: STYLES[i % STYLES.length].color, strokeWidth: 2.2, strokeDasharray: STYLES[i % STYLES.length].dash }} />
              </svg>
              {series[k]}
            </span>
          ))}
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={aria}>
        {annotations
          .filter((a) => a.from >= 0 && a.to >= 0)
          .map((a, i) => (
            <g key={`r${i}`}>
              <rect x={x(a.from)} y={TOP} width={Math.max(x(a.to) - x(a.from), 2)} height={BOTTOM - TOP} style={{ fill: 'var(--critical-bg)' }} />
              <text x={(x(a.from) + x(a.to)) / 2} y={TOP + 24} textAnchor="middle" className="chart-text chart-text--cr">
                {a.text}
              </text>
            </g>
          ))}
        {ticks.map((tick, i) => (
          <g key={i}>
            <line x1={LEFT} x2={RIGHT} y1={y(tick)} y2={y(tick)} style={{ stroke: i === 0 ? 'var(--mu)' : 'var(--bd)' }} />
            <text x={LEFT - 8} y={y(tick) + 4} textAnchor="end" className="chart-axis">
              {fmt.number(tick)}
            </text>
          </g>
        ))}
        {d.threshold != null && (
          <g>
            <line x1={LEFT} x2={RIGHT} y1={y(d.threshold)} y2={y(d.threshold)} style={{ stroke: 'var(--fg)', strokeWidth: 1.2, strokeDasharray: '6 4' }} />
            <text x={LEFT + 6} y={y(d.threshold) - 7} className="chart-text chart-text--fg">
              {d.threshold_label ?? t.chart.threshold(fmt.number(d.threshold))}
            </text>
          </g>
        )}
        {iToday >= 0 && <line x1={x(iToday)} x2={x(iToday)} y1={TOP} y2={BOTTOM} style={{ stroke: 'var(--mu)', strokeDasharray: '2 3' }} />}
        {keys.map((k, i) =>
          segments(k).map((pts, j) => (
            <polyline
              key={`${k}${j}`}
              points={pts.join(' ')}
              style={{ fill: 'none', stroke: STYLES[i % STYLES.length].color, strokeWidth: 2.5, strokeDasharray: STYLES[i % STYLES.length].dash, strokeLinejoin: 'round' }}
            />
          )),
        )}
        {iToday >= 0 && typeof rows[iToday][actual] === 'number' && (
          <circle cx={x(iToday)} cy={y(rows[iToday][actual] as number)} r="4.5" style={{ fill: 'var(--ac)', stroke: 'var(--sf)', strokeWidth: 2 }} />
        )}
        {annotations
          .filter((a) => a.from >= 0 && a.to < 0)
          .map((a, i) => {
            const v = rows[a.from][lastSeries]
            const yy = typeof v === 'number' ? y(v) - 12 - (i % 2) * 14 : TOP + 40 + i * 14
            const anchor = a.from > n * 0.8 ? 'end' : 'start'
            return (
              <text key={`p${i}`} x={x(a.from) + (anchor === 'end' ? -4 : 4)} y={Math.max(yy, TOP + 12)} textAnchor={anchor} className="chart-text chart-text--ok">
                {a.text}
              </text>
            )
          })}
        {xLabels.map((i) => (
          <text
            key={i}
            x={x(i)}
            y={H - 16}
            textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
            className={`chart-axis${i === iToday ? ' chart-axis--today' : ''}`}
          >
            {i === iToday ? t.chart.today(String(rows[i].date)) : String(rows[i].date)}
          </text>
        ))}
      </svg>
    </figure>
  )
}
