import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import type { Request, Response, NextFunction } from 'express'
import compression from 'compression'
import type { ViteDevServer } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isProduction = process.env.NODE_ENV === 'production'
const port = Number(process.env.PORT) || 3001

type SupportedLanguage = 'uk' | 'ru'

function parseCookies(cookieHeader?: string): Record<string, string> {
  const cookies: Record<string, string> = {}
  if (!cookieHeader) return cookies
  for (const cookie of cookieHeader.split(';')) {
    const [name, ...rest] = cookie.trim().split('=')
    if (name) {
      cookies[name] = decodeURIComponent(rest.join('='))
    }
  }
  return cookies
}

function normalizeLanguage(value: unknown): SupportedLanguage | null {
  if (!value || typeof value !== 'string') return null
  const clean = value.toLowerCase().trim()
  if (clean.startsWith('ru')) return 'ru'
  if (clean.startsWith('uk') || clean.startsWith('ua')) return 'uk'
  return null
}

function parseAcceptLanguage(header?: string): SupportedLanguage {
  if (!header) return 'uk'
  const preferences = header
    .split(',')
    .map((part) => {
      const [lang, qPart] = part.trim().split(';q=')
      const q = qPart ? parseFloat(qPart) : 1.0
      return { lang: lang.toLowerCase(), q }
    })
    .sort((a, b) => b.q - a.q)

  for (const pref of preferences) {
    const matched = normalizeLanguage(pref.lang)
    if (matched) return matched
  }
  return 'uk'
}

function resolveServerLanguage(req: Request): SupportedLanguage {
  // 1. ?hl= query param
  if (req.query.hl) {
    const fromQuery = normalizeLanguage(req.query.hl)
    if (fromQuery) return fromQuery
  }

  // 2. Cookie apid_lang
  const cookies = parseCookies(req.headers.cookie)
  if (cookies.apid_lang) {
    const fromCookie = normalizeLanguage(cookies.apid_lang)
    if (fromCookie) return fromCookie
  }

  // 3. Accept-Language header
  const acceptLang = req.headers['accept-language']
  if (acceptLang) {
    return parseAcceptLanguage(acceptLang)
  }

  return 'uk'
}

interface RenderResult {
  appHtml: string
  title: string
  headTags: string
  dehydratedState: unknown
  lang: SupportedLanguage
}

async function createServer() {
  const app = express()

  app.use(compression())

  let vite: ViteDevServer | undefined
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite')
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    })
    app.use(vite.middlewares)
  } else {
    const sirv = (await import('sirv')).default
    app.use(
      sirv(path.resolve(__dirname, 'dist/client'), {
        extensions: [],
        gzip: true,
      })
    )
  }

  app.use(async (req: Request, res: Response, next: NextFunction) => {
    const url = req.originalUrl

    // Skip API, swagger, and static asset requests if any slipped through
    if (
      url.startsWith('/api/') ||
      url.startsWith('/swagger') ||
      (url.includes('.') && !url.includes('.html'))
    ) {
      return next()
    }

    try {
      const lang = resolveServerLanguage(req)
      let template: string
      let render: (url: string, opts: { lang: SupportedLanguage }) => Promise<RenderResult>

      if (!isProduction && vite) {
        template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8')
        template = await vite.transformIndexHtml(url, template)
        const entry = await vite.ssrLoadModule('/src/entry-server.tsx')
        render = entry.render
      } else {
        template = fs.readFileSync(
          path.resolve(__dirname, 'dist/client/index.html'),
          'utf-8'
        )
        const entry = await import(
          `file://${path.resolve(__dirname, 'dist/server/entry-server.js')}`
        )
        render = entry.render
      }

      const rendered = await render(url, { lang })

      const headHtml = `
  <title>${rendered.title || 'Apid'}</title>
${rendered.headTags || ''}`

      const stateScript = `<script>
  window.__INITIAL_DATA__ = ${JSON.stringify(rendered.dehydratedState).replace(/</g, '\\u003c')};
  window.__INITIAL_LANG__ = ${JSON.stringify(rendered.lang)};
</script>`

      const html = template
        .replace('<!--app-head-->', headHtml)
        .replace('<!--app-html-->', rendered.appHtml)
        .replace('<!--app-state-->', stateScript)
        .replace('<html lang="uk"', `<html lang="${rendered.lang}"`)

      res.status(200).set({
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }).end(html)
    } catch (e) {
      if (!isProduction && vite) {
        vite.ssrFixStacktrace(e as Error)
      }
      console.error('SSR Render Error:', e)

      // Fallback to client-side rendering template on render error
      try {
        const rawTemplate = fs.readFileSync(
          path.resolve(__dirname, isProduction ? 'dist/client/index.html' : 'index.html'),
          'utf-8'
        )
        res.status(200).set({ 'Content-Type': 'text/html' }).end(rawTemplate)
      } catch {
        res.status(500).end('Internal Server Error')
      }
    }
  })

  return app
}

createServer().then((app) => {
  app.listen(port, () => {
    console.log(`🚀 SSR Server is running on http://localhost:${port}`)
  })
})
