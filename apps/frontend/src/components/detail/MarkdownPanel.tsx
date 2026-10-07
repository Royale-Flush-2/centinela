import { useState } from 'react'
import { discardMarkdown, publishMarkdown } from '../../api.ts'
import type { DetailResponse } from '../../detail.ts'
import { useI18n } from '../../i18n/context.ts'
import type { Toast } from '../Toasts.tsx'

export function MarkdownPanel({
  id,
  detail,
  onDetail,
  notify,
  onChange,
}: {
  id: string
  detail: DetailResponse
  onDetail: (d: DetailResponse) => void
  notify: (toast: Omit<Toast, 'id'>) => void
  onChange: () => void
}) {
  const { t } = useI18n()
  const m = t.markdownPanel
  const [open, setOpen] = useState(false)
  const [text, setText] = useState<string | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const [sending, setSending] = useState(false)

  const value = text ?? detail.markdown ?? ''

  async function publish() {
    setSending(true)
    try {
      const r = await publishMarkdown(id, value)
      setErrors(r.detail.result?.errors ?? [])
      setWarnings(r.detail.result?.warnings ?? [])
      if (r.accepted) {
        onDetail(r.detail)
        setText(null)
        notify({ tone: 'ok', title: m.published, text: m.publishedText })
        onChange()
      } else {
        notify({ tone: 'error', title: m.invalid, text: m.invalidText(r.detail.result?.errors.length ?? 0) })
      }
    } catch (e) {
      notify({ tone: 'error', title: m.publishFailed, text: e instanceof Error ? e.message : '' })
    } finally {
      setSending(false)
    }
  }

  async function restore() {
    setSending(true)
    try {
      onDetail(await discardMarkdown(id))
      setText(null)
      setErrors([])
      setWarnings([])
      onChange()
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="detail-md-panel" aria-labelledby="h-md-panel">
      <h2 id="h-md-panel" className="detail-collapsible-h">
        <button type="button" className="detail-collapsible detail-collapsible--test" aria-expanded={open} aria-controls="md-panel" onClick={() => setOpen((v) => !v)}>
          <span>
            <span className="detail-collapsible-title">{m.title}</span>
            <span className="detail-label">
              {detail.source ? m.source[detail.source] : m.noDelivery} · {m.readWith}
            </span>
          </span>
          <span className="detail-label">{open ? t.common.hide : t.common.show}</span>
        </button>
      </h2>
      {open && (
        <div id="md-panel" className="detail-md-panel-body">
          <label htmlFor="md-source" className="detail-label detail-label--strong">
            {m.editLabel}
          </label>
          <textarea
            id="md-source"
            className="detail-md"
            spellCheck={false}
            value={value}
            placeholder={m.placeholder(id)}
            onChange={(e) => setText(e.target.value)}
          />
          {errors.length > 0 && (
            <div className="detail-md-errors" role="alert">
              <strong>{m.errorsTitle(errors.length)}</strong>
              <ul>
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          )}
          {warnings.length > 0 && (
            <div className="detail-md-warnings">
              <strong>{m.warningsTitle}</strong>
              <ul>
                {warnings.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="buttons">
            <button type="button" className="btn btn--primary" disabled={sending || !value.trim()} onClick={publish}>
              {m.validateAndPublish}
            </button>
            {text !== null && (
              <button type="button" className="btn" onClick={() => setText(null)}>
                {m.discardChanges}
              </button>
            )}
            {detail.source === 'manual' && (
              <button type="button" className="btn" disabled={sending} onClick={restore}>
                {m.restoreOriginal}
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
