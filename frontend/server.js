import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import compression from 'compression'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isProduction = process.env.NODE_ENV === 'production'
const port = process.env.PORT || 3001

function parseCookies(cookieHeader) {
  const cookies = {}
  if (!cookieHeader) return cookies
  for (const cookie of cookieHeader.split(';')) {
    const [name, ...rest] = cookie.trim().split('=')
    if (name) {
      cookies[name] = decodeURIComponent(rest.join('='))
    }
  }
  return cookies
}

function normalizeLanguage(value) {
  if (!value) return null
  const clean = String(value).toLowerCase().trim()
  if (clean.startsWith('ru')) return 'ru'
  if (clean.startsWith('uk') || clean.startsWith('ua')) return 'uk'
  return null
}

function parseAcceptLanguage(header) {
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

function resolveServerLanguage(req) {
  // 1. ?hl= query param
  if (req.query?.hl) {
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
  if (req.headers['accept-language']) {
    return parseAcceptLanguage(req.headers['accept-language'])
  }

  return 'uk'
}

async function createServer() {
  const app = express()

  app.use(compression())

  let vite
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

  app.use('*', async (req, res, next) => {
    const url = req.originalUrl

    // Skip API, swagger, and static asset requests if any slipped through
    if (
      url.startsWith('/api/') ||
      url.startsWith('/swagger') ||
      url.includes('.') && !url.includes('.html')
    ) {
      return next()
    }

    try {
      const lang = resolveServerLanguage(req)
      let template
      let render

      if (!isProduction) {
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

      let html = template
        .replace('<!--app-head-->', headHtml)
        .replace('<!--app-html-->', rendered.appHtml)
        .replace('<!--app-state-->', stateScript)
        .replace('<html lang="uk"', `<html lang="${rendered.lang}"`)

      res.status(200).set({ 'Content-Type': 'text/html' }).end(html)
    } catch (e) {
      if (!isProduction && vite) {
        vite.ssrFixStacktrace(e)
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
