import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { CreateCommoditySchema, HistoryQuerySchema } from './commodity.schema'

export const commodityRouter: FastifyPluginAsyncZod = async (fastify) => {
    // GET /api/v2/commodities/rates - legacy format (like currency /rates)
    fastify.get('/rates', {
        schema: {
            summary: 'Котировки сырья (Legacy)',
            description: 'Получает все котировки сырьевых товаров в устаревшем формате (объект ключей). Используется для совместимости с парсером.',
            tags: ['Commodities'],
            querystring: z.object({
                refresh: z.string().optional().default('0').describe('Принудительное обновление кэша (1 или true)').transform(v => v === '1' || v === 'true')
            }),
            response: {
                200: z.object({
                    success: z.boolean(),
                    data: z.record(z.string(), z.any()),
                    actual_date: z.string(),
                    cache_used: z.boolean(),
                    has_24h_comparison: z.boolean()
                })
            }
        }
    }, async (req) => {
        const { refresh } = req.query as { refresh: boolean }
        if (refresh) {
            fastify.commodityService.syncAllPrices().catch(console.error)
        }
        return fastify.commodityService.getLegacyRates(refresh)
    })

    // GET /api/v2/commodities/currencies - list all supported commodities
    fastify.get('/currencies', {
        schema: {
            summary: 'Список сырья и металлов',
            description: 'Возвращает список всех доступных сырьевых товаров с метаданными (названия на разных языках, единица измерения, биржа).',
            tags: ['Commodities'],
            response: {
                200: z.object({
                    supported_commodities: z.array(z.string()),
                    commodities: z.record(z.string(), z.object({
                        name: z.string(),
                        nameRu: z.string().nullable(),
                        nameUa: z.string().nullable(),
                        category: z.string(),
                        unit: z.string(),
                        exchange: z.string().nullable(),
                    }))
                })
            }
        }
    }, async () => {
        return fastify.commodityService.getSupportedCommodities()
    })

    // GET /api/v2/commodities/rates/list - detailed list with latest rates
    fastify.get('/rates/list', {
        schema: {
            summary: 'Котировки сырья (Массив)',
            description: 'Получает список всех сырьевых товаров с текущими ценами и трендами за 24 часа. Идеально для построения таблиц на фронтенде.',
            tags: ['Commodities'],
            querystring: z.object({
                category: z.string().optional().describe('Фильтр по категории. Возможные значения: metals, commodities'),
                lang: z.string().optional().default('ru').describe('Язык ответа (например: ru, uk, en)')
            }),
            response: {
                200: z.object({
                    success: z.boolean(),
                    data: z.array(z.any())
                })
            }
        }
    }, async (req) => {
        const { category, lang } = req.query as { category?: string, lang?: string }
        const currentLang = lang || 'ru';
        let commodities = await fastify.commodityService.getAllCommodities(category)

        if (currentLang) {
            commodities = commodities.map(c => {
                let localizedName = c.name;
                if (currentLang === 'ru' && c.nameRu) localizedName = c.nameRu;
                if (currentLang === 'uk' && c.nameUa) localizedName = c.nameUa;
                return {
                    ...c,
                    name: localizedName
                }
            }) as any
        }

        return { success: true, data: commodities }
    })

    // GET /api/v2/commodities/rates/:key/history - history by symbol
    fastify.get('/rates/:key/history', {
        schema: {
            summary: 'История цен сырья',
            description: 'Получает исторические цены сырья для построения графиков.\n\n**Параметры:**\n* `key` (строка) — тикер сырья (например, `"XAU"`)\n* `days` (число) — за сколько дней вернуть данные\n* `year` (число) — вернуть данные за конкретный год.',
            tags: ['Commodities'],
            params: z.object({
                key: z.string().describe('Тикер сырьевого товара (например, XAU, BZ, NG)')
            }),
            querystring: HistoryQuerySchema,
            response: {
                200: z.object({
                    success: z.boolean(),
                    data: z.array(z.object({
                        price: z.number(),
                        createdAt: z.date()
                    }))
                }),
                404: z.object({
                    success: z.boolean(),
                    message: z.string()
                })
            }
        }
    }, async (req, reply) => {
        const { key } = req.params as { key: string }
        const { days, year } = req.query as any
        try {
            const history = await fastify.commodityService.getHistory(key, days, year)
            return { success: true, data: history }
        } catch (err: any) {
            if (err.message?.startsWith('Commodity not found')) {
                return reply.code(404).send({ success: false, message: err.message })
            }
            throw err
        }
    })

    // GET /api/v2/commodities/rates/:key/years - available years
    fastify.get('/rates/:key/years', {
        schema: {
            summary: 'Доступные годы истории',
            description: 'Возвращает массив годов, за которые есть исторические цены в БД по данному товару.',
            tags: ['Commodities'],
            params: z.object({
                key: z.string().describe('Тикер сырьевого товара (например, XAU, BZ, NG)')
            }),
            response: {
                200: z.object({
                    success: z.boolean(),
                    data: z.array(z.number())
                })
            }
        }
    }, async (req) => {
        const { key } = req.params as { key: string }
        const years = await fastify.commodityService.getAvailableYears(key)
        return { success: true, data: years }
    })

    // GET /api/v2/commodities/health - health check
    fastify.get('/health', {
        schema: {
            summary: 'Healthcheck сырья',
            description: 'Проверяет состояние сервиса котировок сырья (время последнего обновления парсера, доступность).',
            tags: ['Commodities'],
            response: {
                200: z.object({
                    status: z.string(),
                    message: z.string(),
                    last_update: z.string(),
                    commodities_available: z.number(),
                    has_24h_comparison: z.boolean()
                })
            }
        }
    }, async () => {
        return fastify.commodityService.healthCheck()
    })

    // POST /api/v2/commodities/rates/sync - force sync all (admin)
    fastify.post('/rates/sync', {
        preHandler: [fastify.authenticateAdmin],
        schema: {
            description: 'Принудительно запустить обновление всех цен сырьевых товаров (Admin only)',
            tags: ['Admin'],
            response: {
                200: z.object({
                    success: z.boolean(),
                    message: z.string()
                })
            }
        }
    }, async () => {
        fastify.commodityParserService.run().catch(console.error);
        return { success: true, message: 'Commodity sync process started in background' };
    })

    // POST /api/v2/commodities/rates/add - add new commodity (admin)
    fastify.post('/rates/add', {
        preHandler: [fastify.authenticateAdmin],
        schema: {
            description: 'Добавить новый сырьевой товар в базу данных (Только для админов)',
            tags: ['Admin'],
            body: CreateCommoditySchema,
            response: {
                201: z.object({
                    success: z.boolean(),
                    data: z.any()
                }),
                401: z.object({
                    success: z.boolean(),
                    message: z.string()
                }),
                400: z.object({
                    success: z.boolean(),
                    message: z.string(),
                    errors: z.any().optional()
                })
            }
        }
    }, async (req, reply) => {
        const newCommodity = await fastify.commodityService.addCommodity(req.body)
        return reply.status(201).send({ success: true, data: newCommodity })
    })

}

export default commodityRouter
