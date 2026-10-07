import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Connect, Plugin } from 'vite'
import { SEVERITIES, STATUSES, TOPICS, VIEWS, type FieldFilter, type Lang, type Severity, type SortOrder, type View } from '../src/domain.ts'
import { ApiError, createStore } from './store.ts'


const SORTS: readonly SortOrder[] = ['amount', 'severity', 'recent', 'relevance']

const MESSAGES = {
  es: { invalidJson: 'El cuerpo no es JSON válido', emptyMarkdown: 'El Markdown está vacío', notFound: (route: string) => `Ruta no encontrada: ${route}`, internal: 'Error interno' },
  en: { invalidJson: 'The body is not valid JSON', emptyMarkdown: 'The Markdown is empty', notFound: (route: string) => `Route not found: ${route}`, internal: 'Internal error' },
}

const languageOf = (req: IncomingMessage): Lang => (req.headers['accept-language']?.trim().toLowerCase().startsWith('en') ? 'en' : 'es')

function filter<T extends string>(p: URLSearchParams, key: string, allowed: readonly T[]): FieldFilter<T> {
  const value = p.get(key)
  return {
    values: value ? value.split(',').filter((v): v is T => (allowed as readonly string[]).includes(v)) : [],
    op: p.get(`${key}_op`) === 'is_not' ? 'is_not' : 'is',
  }
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}

async function readText(req: IncomingMessage): Promise<string> {
  const parts: Buffer[] = []
  for await (const part of req) parts.push(part as Buffer)
  return Buffer.concat(parts).toString('utf8')
}

async function readJson(req: IncomingMessage, lang: Lang): Promise<Record<string, unknown>> {
  const text = (await readText(req)).trim()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    throw new ApiError(400, MESSAGES[lang].invalidJson)
  }
}

const wait = () => new Promise((r) => setTimeout(r, 120 + Math.random() * 250))

export function mockApi(): Plugin {
  const store = createStore()

  const handle: Connect.NextHandleFunction = (req, res, next) => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    if (!url.pathname.startsWith('/api/')) return next()
    const lang = languageOf(req)

    const respond = async () => {
      const route = url.pathname.replace(/\/+$/, '')
      const method = req.method ?? 'GET'

      if (method === 'GET' && route === '/api/events') {
        const since = url.searchParams.get('since')
        return send(res, 200, store.events(since === null ? null : Number(since), lang))
      }

      await wait()

      if (method === 'GET' && route === '/api/summary') return send(res, 200, store.summary())

      if (method === 'GET' && route === '/api/alerts') {
        const p = url.searchParams
        const sort = p.get('sort') as SortOrder | null
        const view = p.get('view') as View | null
        return send(
          res,
          200,
          store.list(
            {
              view: view && VIEWS.includes(view) ? view : 'pending',
              q: p.get('q') ?? '',
              topic: filter(p, 'topic', TOPICS),
              status: filter(p, 'status', STATUSES),
              priority: filter(p, 'priority', SEVERITIES),
              sort: sort && SORTS.includes(sort) ? sort : 'amount',
            },
            lang,
          ),
        )
      }

      if (method === 'POST' && route === '/api/alerts/simulate') {
        const body = await readJson(req, lang)
        const severity = SEVERITIES.includes(body.severity as Severity) ? (body.severity as Severity) : undefined
        return send(res, 201, store.simulate(lang, severity))
      }

      const detail = route.match(/^\/api\/alerts\/([^/]+)\/detail$/)
      if (detail) {
        const id = decodeURIComponent(detail[1])
        if (method === 'GET') return send(res, 200, store.detail(id, lang))
        if (method === 'DELETE') return send(res, 200, store.discardMarkdown(id, lang))
        if (method === 'PUT') {
          const markdown = await readText(req)
          if (!markdown.trim()) throw new ApiError(400, MESSAGES[lang].emptyMarkdown)
          const { accepted, detail: d } = store.publishMarkdown(id, markdown, lang)
          return send(res, accepted ? 200 : 422, d)
        }
      }

      const decision = route.match(/^\/api\/alerts\/([^/]+)\/(approve|reject)$/)
      if (method === 'POST' && decision) {
        const action = decision[2] as 'approve' | 'reject'
        const body = await readJson(req, lang)
        return send(res, 200, store.decide(decodeURIComponent(decision[1]), action, body, lang))
      }

      throw new ApiError(404, MESSAGES[lang].notFound(`${method} ${route}`))
    }

    respond().catch((e: unknown) => {
      if (e instanceof ApiError) send(res, e.status, { error: e.message })
      else send(res, 500, { error: e instanceof Error ? e.message : MESSAGES[lang].internal })
    })
  }

  return {
    name: 'centinela-mock-api',
    configureServer(server) {
      server.middlewares.use(handle)
    },
    configurePreviewServer(server) {
      server.middlewares.use(handle)
    },
  }
}
