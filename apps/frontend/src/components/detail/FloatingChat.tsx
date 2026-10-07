import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useI18n } from '../../i18n/context.ts'
import { CloseIcon } from '../Icons.tsx'

const HEADER_HEIGHT = 61
const BUBBLE_HEIGHT = 56
const GAP = 16

export function FloatingChat({ children }: { children: ReactNode }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [maxHeight, setMaxHeight] = useState<number>(520)
  const root = useRef<HTMLDivElement>(null)
  const bubble = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const dock = root.current?.parentElement
    if (!dock) return
    const measure = () => {
      const free = dock.getBoundingClientRect().top - HEADER_HEIGHT - GAP * 3 - BUBBLE_HEIGHT
      setMaxHeight(Math.max(240, Math.min(560, free)))
    }
    measure()
    const obs = new ResizeObserver(measure)
    obs.observe(dock)
    window.addEventListener('resize', measure)
    root.current?.querySelector<HTMLInputElement>('#detail-question')?.focus()
    return () => {
      obs.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [open])

  const close = () => {
    setOpen(false)
    bubble.current?.focus()
  }

  return (
    <div className="detail-chat-float" ref={root}>
      <div
        id="detail-chat-panel"
        className="detail-chat-panel"
        role="dialog"
        aria-label={t.chat.dialogLabel}
        hidden={!open}
        style={{ maxHeight }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') close()
        }}
      >
        <button type="button" className="detail-chat-close" aria-label={t.chat.close} onClick={close}>
          <CloseIcon size={14} />
        </button>
        {children}
      </div>
      <button
        ref={bubble}
        type="button"
        className="detail-chat-bubble"
        aria-label={open ? t.chat.closeBubble : t.chat.openBubble}
        aria-expanded={open}
        aria-controls="detail-chat-panel"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? (
          <CloseIcon size={18} />
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4h0A1.5 1.5 0 0 1 4 14.5z"
              style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinejoin: 'round' }}
            />
            <path d="M8.5 8.5h7M8.5 11.5h4.5" style={{ stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' }} />
          </svg>
        )}
      </button>
    </div>
  )
}
