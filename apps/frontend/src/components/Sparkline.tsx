import type { Series, Severity } from '../domain.ts'
import { useI18n } from '../i18n/context.ts'

const W = 150
const H = 40
const PAD = 4

export function Sparkline({ series, severity }: { series: Series; severity: Severity }) {
  const { fmt } = useI18n()
  const { values, threshold } = series
  const min = Math.min(...values, threshold)
  const max = Math.max(...values, threshold)
  const range = max - min || 1
  const x = (i: number) => (i * (W - 1)) / Math.max(values.length - 1, 1)
  const y = (v: number) => PAD + (1 - (v - min) / range) * (H - PAD * 2)
  const points = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const last = values[values.length - 1]

  return (
    <figure className="spark">
      <figcaption>
        <span>{series.label}</span>
        <strong>{fmt.value(last, series.unit)}</strong>
      </figcaption>
      <svg width="132" height="36" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={series.summary}>
        <line x1="0" x2={W} y1={y(threshold)} y2={y(threshold)} className="spark-threshold" />
        <polyline points={points} className="spark-line" />
        <circle cx={x(values.length - 1)} cy={y(last)} r="3.2" style={{ fill: `var(--${severity})` }} />
      </svg>
    </figure>
  )
}
