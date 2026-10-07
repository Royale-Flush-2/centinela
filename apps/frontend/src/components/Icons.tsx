import type { Severity } from '../domain.ts'

export function SeverityIcon({ severity, withMark = true }: { severity: Severity; withMark?: boolean }) {
  const mark = { stroke: 'var(--sf)', strokeWidth: 1.6, strokeLinecap: 'round' as const, fill: 'none' }
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      {severity === 'critical' && (
        <>
          <path d="M5.2 1.2h5.6l4 4v5.6l-4 4H5.2l-4-4V5.2z" fill="currentColor" />
          {withMark && <path d="M8 4.6v4.1M8 11v.4" style={{ ...mark, strokeWidth: 1.7 }} />}
        </>
      )}
      {severity === 'high' && (
        <>
          <path d="M8 1.4l7 12.6H1z" fill="currentColor" />
          {withMark && <path d="M8 6v3.6M8 11.6v.3" style={mark} />}
        </>
      )}
      {severity === 'medium' && (
        <>
          <circle cx="8" cy="8" r="6.6" fill="currentColor" />
          {withMark && <path d="M8 4.8v3.6M8 10.8v.3" style={mark} />}
        </>
      )}
      {severity === 'low' && <circle cx="8" cy="8" r="3.6" fill="currentColor" />}
    </svg>
  )
}

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

export const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <circle cx="7" cy="7" r="4.8" {...stroke} />
    <path d="M10.6 10.6L14 14" {...stroke} />
  </svg>
)

export const CloseIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
    <path d="M4 4l8 8M12 4l-8 8" {...stroke} />
  </svg>
)

export const SparkleIcon = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M8 1.5l1.6 4.9 4.9 1.6-4.9 1.6L8 14.5l-1.6-4.9L1.5 8l4.9-1.6z" fill="currentColor" />
  </svg>
)

export const FlaskIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M6 1.8h4M6.6 1.8v4.4L2.6 13a1 1 0 0 0 .9 1.4h9a1 1 0 0 0 .9-1.4L9.4 6.2V1.8M4.4 10h7.2" {...stroke} />
  </svg>
)

export const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <circle cx="8" cy="8" r="7" fill="currentColor" />
    <path d="M4.8 8.2l2.1 2.1 4.3-4.4" style={{ fill: 'none', stroke: 'var(--sf)', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' }} />
  </svg>
)

export const AgentIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className="spinning">
    <circle cx="6" cy="6" r="4.5" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeDasharray: '18 8' }} />
  </svg>
)

export const Logo = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
    <rect width="24" height="24" rx="6" style={{ fill: 'var(--ac)' }} />
    <path d="M5 12.5h3.2l2-4.5 3 9 2-4.5H19" style={{ fill: 'none', stroke: 'var(--acf)', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' }} />
  </svg>
)
