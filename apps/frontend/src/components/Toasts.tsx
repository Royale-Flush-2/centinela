import type { Severity } from '../domain.ts'
import { useI18n } from '../i18n/context.ts'
import { CheckIcon, CloseIcon, SeverityIcon } from './Icons.tsx'

export interface Toast {
  id: number
  tone: Severity | 'ok' | 'error'
  title: string
  text: string
  alertId?: string
}

interface Props {
  toasts: Toast[]
  onClose: (id: number) => void
  onView: (alertId: string) => void
}

export function Toasts({ toasts, onClose, onView }: Props) {
  const { t } = useI18n()
  return (
    <div className="toasts" aria-live="polite" aria-relevant="additions">
      {toasts.map((a) => (
        <div key={a.id} className={`toast toast--${a.tone}`} role="status">
          <span className="toast-icon">
            {a.tone === 'ok' ? <CheckIcon /> : a.tone === 'error' ? <SeverityIcon severity="critical" /> : <SeverityIcon severity={a.tone} />}
          </span>
          <div className="toast-text">
            <strong>{a.title}</strong>
            <span>{a.text}</span>
          </div>
          {a.alertId && (
            <button
              type="button"
              className="btn btn--small"
              onClick={() => {
                onView(a.alertId!)
                onClose(a.id)
              }}
            >
              {t.common.view}
            </button>
          )}
          <button type="button" className="toast-close" aria-label={t.toasts.close} onClick={() => onClose(a.id)}>
            <CloseIcon size={12} />
          </button>
        </div>
      ))}
    </div>
  )
}
