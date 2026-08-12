import fastifySwagger from '@fastify/swagger'
import fastifySwaggerUi from '@fastify/swagger-ui'
import { jsonSchemaTransform } from 'fastify-type-provider-zod'
import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import path from 'node:path'
import fs from 'node:fs'

let liveExamples: Record<string, any> = {}

/** Карта: url паттерн → endpoint для фетча реальных данных */
const EXAMPLE_SOURCES: Record<string, { path: string; method?: string; body?: any }> = {
  '/api/v2/currency/rates':  { path: '/api/v2/currency/rates' },
  '/api/v2/currency/currencies': { path: '/api/v2/currency/currencies' },
  '/api/v2/currency/rates/list': { path: '/api/v2/currency/rates/list' },
  '/api/v2/currency/convert': { path: '/api/v2/currency/convert', method: 'POST', body: { amount: 100, from_currency: 'usd', to_currencies: ['rub', 'eur', 'uah'] } },
  '/api/v2/currency/health': { path: '/api/v2/currency/health' },
  '/api/v2/currency/rates/{key}/history': { path: '/api/v2/currency/rates/usd_rub/history?days=30' },
  '/api/v2/currency/rates/{key}/years': { path: '/api/v2/currency/rates/usd_rub/years' },
  '/api/v2/commodities/rates': { path: '/api/v2/commodities/rates' },
  '/api/v2/commodities/currencies': { path: '/api/v2/commodities/currencies' },
  '/api/v2/commodities/rates/list': { path: '/api/v2/commodities/rates/list' },
  '/api/v2/commodities/rates/{key}/history': { path: '/api/v2/commodities/rates/XAU/history?days=30' },
  '/api/v2/commodities/rates/{key}/years': { path: '/api/v2/commodities/rates/XAU/years' },
  '/api/v2/commodities/health': { path: '/api/v2/commodities/health' },
  '/api/v2/memes': { path: '/api/v2/memes' },
  '/api/v2/facts': { path: '/api/v2/facts' },
  '/api/v2/movies': { path: '/api/v2/movies' },
  '/api/v2/holidays/today': { path: '/api/v2/holidays/today' },
  '/api/v2/holidays/upcoming': { path: '/api/v2/holidays/upcoming' },
  '/api/v2/holidays/list': { path: '/api/v2/holidays/list' },
  '/api/v2/holidays/date/{month}/{day}': { path: '/api/v2/holidays/date/6/22' },
  '/api/v2/holidays/{month}/{day}': { path: '/api/v2/holidays/6/22' },
}

/** Фоллбэк-примеры на случай если сервер ещё не стартовал или фетч упал */
const FALLBACK_EXAMPLES: Record<string, any> = {
  '/api/v2/currency/rates': { success: true, data: { btc_to_usd: { rate: 64045.965, change: { absolute: 76.95, percent: 0.12, direction: 'up' } }, usd_to_rub: { rate: 73.439, change: { absolute: 0, percent: 0, direction: 'stable' } } }, currency_symbols: { usd: { name: 'USD', symbol: '$', emoji: '$', description: 'Доллар США' } }, actual_date: '22.06.2026 12:30:00', cache_used: true, has_24h_comparison: true },
  '/api/v2/currency/currencies': { supported_currencies: ['usd', 'eur', 'rub', 'uah', 'btc'], currencies: { usd: { name: 'USD', symbol: '$', emoji: '$', description: 'Доллар США' } } },
  '/api/v2/currency/rates/list': { success: true, data: [{ id: 'usd_rub', rate: 73.439 }] },
  '/api/v2/currency/convert': { success: true, data: { rub: { value: 7343.9, amount: 7343.9, rate: 73.439, symbol: '₽', emoji: '🇷🇺' } }, actual_date: '22.06.2026 12:30:00', cache_used: true },
  '/api/v2/currency/health': { status: 'healthy', message: 'Данные актуальны', last_update: '22.06.2026 12:30:00', currencies_available: 14, has_24h_comparison: true },
  '/api/v2/currency/rates/{key}/history': { success: true, data: [{ price: 73.44, createdAt: '2026-06-22T00:00:00.000Z' }] },
  '/api/v2/currency/rates/{key}/years': { success: true, data: [2024, 2025, 2026] },
  '/api/v2/commodities/rates': { success: true, data: { XAU: { rate: 2345.5, change: { absolute: 12.4, percent: 0.5, direction: 'up' } } }, actual_date: '22.06.2026 12:30:00', cache_used: true, has_24h_comparison: true },
  '/api/v2/commodities/currencies': { supported_commodities: ['XAU', 'XAG', 'BRENT'], commodities: { XAU: { name: 'Gold', nameRu: 'Золото', nameUa: 'Золото', category: 'metals', unit: 'oz', exchange: 'COMEX' } } },
  '/api/v2/commodities/rates/list': { success: true, data: [{ id: 'XAU', rate: 2345.5 }] },
  '/api/v2/commodities/rates/{key}/history': { success: true, data: [{ price: 2340.1, createdAt: '2026-06-22T00:00:00.000Z' }] },
  '/api/v2/commodities/rates/{key}/years': { success: true, data: [2024, 2025, 2026] },
  '/api/v2/commodities/health': { status: 'healthy', message: 'Данные актуальны', last_update: '22.06.2026 12:30:00', commodities_available: 5, has_24h_comparison: true },
  '/api/v2/memes': { success: true, data: { result: { image: 'https://apid.r00t.top/api/v2/memes/image-proxy/.../meme.jpg', description: 'Мем', source: 'anekdot.me' } } },
  '/api/v2/facts': { success: true, data: { result: { text: 'Интересный факт' }, message: 'Случайный факт успешно получен' } },
  '/api/v2/movies': { success: true, data: { result: { title: 'Фильм' }, message: 'Случайный фильм успешно получен' } },
  '/api/v2/holidays/today': { status: 'success', date: '2026-06-22', holidays: [{ name: 'Праздник' }] },
  '/api/v2/holidays/upcoming': { status: 'success', holidays: [{ name: 'Ближайший праздник', date: '2026-06-28' }] },
  '/api/v2/holidays/list': { status: 'success', holidays: [{ name: 'Праздник' }] },
  '/api/v2/holidays/date/{month}/{day}': { status: 'success', holidays: [{ name: 'Праздник по дате' }] },
  '/api/v2/holidays/{month}/{day}': { status: 'success', holidays: [{ name: 'Праздник по дате' }] },
}

/** Найти пример для URL — сначала живые, потом фоллбэк */
function findExample(urlPath: string): any {
  if (liveExamples[urlPath]) return liveExamples[urlPath]

  for (const [pattern, example] of Object.entries(liveExamples)) {
    if (matchUrl(pattern, urlPath)) return example
  }

  if (FALLBACK_EXAMPLES[urlPath]) return FALLBACK_EXAMPLES[urlPath]
  for (const [pattern, example] of Object.entries(FALLBACK_EXAMPLES)) {
    if (matchUrl(pattern, urlPath)) return example
  }

  return null
}

function matchUrl(pattern: string, urlPath: string): boolean {
  const patternParts = pattern.split('/')
  const urlParts = urlPath.split('/')
  if (patternParts.length !== urlParts.length) return false
  for (let i = 0; i < patternParts.length; i++) {
    const isParam = patternParts[i].startsWith('{') && patternParts[i].endsWith('}')
    if (!isParam && patternParts[i] !== urlParts[i]) return false
  }
  return true
}

async function fetchExamples(port: number): Promise<Record<string, any>> {
  const result: Record<string, any> = {}
  const baseUrl = `http://127.0.0.1:${port}`
  for (const [pattern, source] of Object.entries(EXAMPLE_SOURCES)) {
    try {
      const res = await fetch(`${baseUrl}${source.path}`, source.method === 'POST' ? {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(source.body || {}),
        signal: AbortSignal.timeout(5000)
      } : { signal: AbortSignal.timeout(5000) })
      if (res.ok) {
        const data = await res.json()
        result[pattern] = data
        console.log(`📦 Example fetched: ${pattern}`)
      } else {
        console.warn(`⚠️ Example fetch failed (${res.status}): ${pattern}`)
      }
    } catch (err: any) {
      console.warn(`⚠️ Example fetch error: ${pattern} - ${err.message}`)
    }
  }
  return result
}

export default fp(async (fastify: FastifyInstance) => {
    const frontendUrl = process.env.FRONTEND_URL as string

    await fastify.register(fastifySwagger, {
        openapi: {
            info: {
                title: 'Apid Public API',
                description: `Интерактивная спецификация публичного API сервиса Apid.\n\n🔗 **[← Вернуться на главную страницу сайта](${frontendUrl})**`,
                version: '2.0.0'
            },
            tags: [
                { name: 'Currency', description: '🪙 Актуальные курсы фиатных валют и криптовалют, конвертер, история изменения цен и графики.' },
                { name: 'Commodities', description: '🛢️ Биржевые котировки драгоценных и промышленных металлов, а также энергоресурсов.' },
                { name: 'Holidays', description: '📅 Информация о праздниках на любой день года (приметы, именины, события).' },
                { name: 'Memes', description: '😂 Генерация случайных мемов с картинками и текстовыми шутками.' },
                { name: 'Movies', description: '🎬 Получение случайных фильмов для просмотра с описанием и жанрами.' },
                { name: 'Facts', description: '🧠 Случайные и интересные факты обо всём на свете.' }
            ],
            servers: [{ url: process.env.API_URL as string }]
        },
        transform: (data) => {
            const { schema, url } = data;

            const singularPaths = ['/api/v2/meme', '/api/v2/fact', '/api/v2/movie'];
            if (
                url.startsWith('/api/v2/admin') ||
                singularPaths.some(p => url === p || url.startsWith(p + '/')) ||
                (schema?.tags && schema.tags.includes('Admin'))
            ) {
                return { schema: { ...schema, hide: true }, url };
            }

            const result = jsonSchemaTransform(data);
            const resultSchema = result.schema as any;

            if (resultSchema?.response && typeof resultSchema.response === 'object') {
              const example = findExample(url);
              if (example) {
                for (const statusCode of Object.keys(resultSchema.response)) {
                  const resp = resultSchema.response[statusCode];
                  if (resp && typeof resp === 'object') {
                    resp.example = example;
                  }
                }
              }
            }

            if (resultSchema?.body && typeof resultSchema.body === 'object') {
              for (const [pattern, source] of Object.entries(EXAMPLE_SOURCES)) {
                if (matchUrl(pattern, url) && source.body) {
                  resultSchema.body.example = source.body;
                  break;
                }
              }
            }

            return result;
        },
    })

    const port = parseInt(process.env.PORT || '5008', 10)
    fastify.addHook('onReady', () => {
      setTimeout(async () => {
        liveExamples = await fetchExamples(port)
        console.log(`📦 Loaded ${Object.keys(liveExamples).length} live examples for Swagger UI`)
      }, 1000)
    })

    let logoConfig: any = undefined
    try {
        const logoPath = require.resolve('@fastify/swagger-ui/static/logo.svg')
        const logoContent = fs.readFileSync(logoPath)
        logoConfig = {
            type: 'image/svg+xml',
            content: logoContent,
            href: frontendUrl
        }
    } catch (err) {
        logoConfig = {
            href: frontendUrl
        }
    }

    await fastify.register(fastifySwaggerUi, {
        routePrefix: '/swagger',
        logo: logoConfig
    })
})
