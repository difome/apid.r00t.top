import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { seedCurrencyHistory } from '@/modules/currency/history-seeder'
import { CreateCommoditySchema, UpdateCommoditySchema } from '@/modules/commodities/commodity.schema'

export async function adminRouter(fastify: FastifyInstance) {
    fastify.addHook('onRequest', fastify.authenticateAdmin);

    fastify.get('/logs', {
        schema: {
            description: 'Получить логи парсинга',
            tags: ['Admin'],
            querystring: z.object({
                limit: z.string().optional().transform(v => v ? parseInt(v) : 50)
            }),
            response: {
                200: z.array(z.object({
                    id: z.number(),
                    status: z.string(),
                    source: z.string().nullable(),
                    message: z.string(),
                    duration: z.number().nullable(),
                    createdAt: z.date()
                }))
            }
        }
    }, async (req) => {
        const { limit } = req.query as { limit: number };
        return fastify.adminService.getParsingLogs(limit);
    });

    fastify.get('/traffic', {
        schema: {
            description: 'Получить логи трафика API',
            tags: ['Admin'],
            querystring: z.object({
                limit: z.string().optional().transform(v => v ? parseInt(v) : 50)
            }),
            response: {
                200: z.array(z.object({
                    id: z.number(),
                    ip: z.string(),
                    method: z.string(),
                    path: z.string(),
                    userAgent: z.string().nullable(),
                    query: z.string().nullable(),
                    body: z.string().nullable(),
                    country: z.string().nullable(),
                    city: z.string().nullable(),
                    createdAt: z.date()
                }))
            }
        }
    }, async (req) => {
        const { limit } = req.query as { limit: number };
        return fastify.adminService.getTrafficLogs(limit);
    });

    fastify.get('/config', {
        schema: {
            description: 'Получить системную настройку',
            tags: ['Admin'],
            querystring: z.object({
                key: z.string()
            }),
            response: {
                200: z.object({
                    key: z.string(),
                    value: z.string()
                }).nullable()
            }
        }
    }, async (req) => {
        const { key } = req.query as { key: string };
        return fastify.adminService.getConfig(key);
    });

    fastify.post('/config', {
        schema: {
            description: 'Обновить системную настройку',
            tags: ['Admin'],
            body: z.object({
                key: z.string(),
                value: z.string()
            }),
            response: {
                200: z.object({
                    success: z.boolean()
                })
            }
        }
    }, async (req) => {
        const { key, value } = req.body as { key: string, value: string };
        await fastify.adminService.setConfig(key, value);
        
        if (key === 'parser_cron') {
            fastify.updateCronSchedule(value);
        }

        return { success: true };
    });

    fastify.get('/currencies', {
        schema: {
            description: 'Получить все валюты (для админки)',
            tags: ['Admin'],
            response: {
                200: z.array(z.object({
                    key: z.string(),
                    name: z.string(),
                    type: z.string(),
                    source: z.string(),
                    baseCurrency: z.string(),
                    targetCurrency: z.string(),
                    symbol: z.string().nullable(),
                    emoji: z.string().nullable(),
                    enabled: z.boolean(),
                    order: z.number(),
                    ratesCount: z.number().optional(),
                    params: z.any().nullable()
                }))
            }
        }
    }, async () => {
        return fastify.adminService.getAllCurrencies();
    });

    fastify.post('/currencies', {
        schema: {
            description: 'Создать новую валюту',
            tags: ['Admin'],
            body: z.object({
                key: z.string(),
                name: z.string().optional(),
                type: z.string().optional(),
                source: z.string(),
                baseCurrency: z.string(),
                targetCurrency: z.string(),
                symbol: z.string().optional(),
                emoji: z.string().optional(),
                enabled: z.boolean().default(true),
                params: z.any().optional()
            }),
            response: {
                200: z.object({ success: z.boolean() })
            }
        }
    }, async (req) => {
        await fastify.adminService.createCurrency(req.body);
        return { success: true };
    });

    fastify.patch('/currencies/:key', {
        schema: {
            description: 'Обновить валюту',
            tags: ['Admin'],
            params: z.object({ key: z.string() }),
            body: z.object({
                name: z.string().optional(),
                type: z.string().optional(),
                source: z.string().optional(),
                baseCurrency: z.string().optional(),
                targetCurrency: z.string().optional(),
                symbol: z.string().optional(),
                emoji: z.string().optional(),
                enabled: z.boolean().optional(),
                params: z.any().optional()
            }),
            response: {
                200: z.object({ success: z.boolean() })
            }
        }
    }, async (req) => {
        const { key } = req.params as { key: string };
        await fastify.adminService.updateCurrency(key, req.body);
        return { success: true };
    });

    fastify.delete('/currencies/:key', {
        schema: {
            description: 'Удалить валюту',
            tags: ['Admin'],
            params: z.object({ key: z.string() }),
            response: {
                200: z.object({ success: z.boolean() })
            }
        }
    }, async (req) => {
        const { key } = req.params as { key: string };
        await fastify.adminService.deleteCurrency(key);
        return { success: true };
    });

    fastify.post('/currencies/:key/sync', {
        schema: {
            description: 'Синхронизировать историю валюты в фоне',
            tags: ['Admin'],
            params: z.object({ key: z.string() }),
            response: {
                200: z.object({ success: z.boolean() })
            }
        }
    }, async (req) => {
        const { key } = req.params as { key: string };
        seedCurrencyHistory(key).catch(err => {
            console.error(`[Admin Service] Manual background seeding failed for ${key}:`, err);
        });
        return { success: true };
    });

    fastify.get('/bans', {
        schema: {
            description: 'Список забаненных IP',
            tags: ['Admin'],
            response: {
                200: z.array(z.object({
                    ip: z.string(),
                    reason: z.string().nullable(),
                    createdAt: z.date()
                }))
            }
        }
    }, async () => {
        return prisma.bannedIp.findMany({ orderBy: { createdAt: 'desc' } });
    });

    fastify.post('/bans', {
        schema: {
            description: 'Забанить IP',
            tags: ['Admin'],
            body: z.object({
                ip: z.string(),
                reason: z.string().optional()
            }),
            response: {
                200: z.object({ success: z.boolean() })
            }
        }
    }, async (req) => {
        const { ip, reason } = req.body as { ip: string, reason?: string };
        await fastify.adminService.banIp(ip, reason);
        await fastify.updateBansCache();
        return { success: true };
    });

    fastify.delete('/bans/:ip', {
        schema: {
            description: 'Разбанить IP',
            tags: ['Admin'],
            params: z.object({ ip: z.string() }),
            response: {
                200: z.object({ success: z.boolean() })
            }
        }
    }, async (req) => {
        const { ip } = req.params as { ip: string };
        await fastify.adminService.unbanIp(ip);
        await fastify.updateBansCache();
        return { success: true };
    });

    // ---------- COMMODITY ADMIN ENDPOINTS ----------

    fastify.get('/commodities', {
        schema: {
            description: 'Получить все сырьевые товары (для админки)',
            tags: ['Admin'],
            response: {
                200: z.array(z.object({
                    id: z.number(),
                    symbol: z.string(),
                    name: z.string(),
                    nameRu: z.string().nullable(),
                    nameUa: z.string().nullable(),
                    category: z.string(),
                    unit: z.string(),
                    exchange: z.string().nullable(),
                    source: z.string(),
                    params: z.any().nullable(),
                    order: z.number(),
                    enabled: z.boolean(),
                    ratesCount: z.number().optional(),
                    createdAt: z.date(),
                    updatedAt: z.date(),
                }))
            }
        }
    }, async () => {
        return fastify.commodityService.getAllCommoditiesAdmin();
    });

    fastify.post('/commodities', {
        schema: {
            description: 'Создать новый сырьевой товар',
            tags: ['Admin'],
            body: CreateCommoditySchema,
            response: {
                200: z.object({ success: z.boolean(), data: z.any() })
            }
        }
    }, async (req) => {
        const data = await fastify.commodityService.addCommodity(req.body as any);
        return { success: true, data };
    });

    fastify.patch('/commodities/:symbol', {
        schema: {
            description: 'Обновить сырьевой товар',
            tags: ['Admin'],
            params: z.object({ symbol: z.string() }),
            body: UpdateCommoditySchema,
            response: {
                200: z.object({ success: z.boolean() })
            }
        }
    }, async (req) => {
        const { symbol } = req.params as { symbol: string };
        await fastify.commodityService.updateCommodity(symbol, req.body as any);
        return { success: true };
    });

    fastify.delete('/commodities/:symbol', {
        schema: {
            description: 'Удалить сырьевой товар',
            tags: ['Admin'],
            params: z.object({ symbol: z.string() }),
            response: {
                200: z.object({ success: z.boolean() })
            }
        }
    }, async (req) => {
        const { symbol } = req.params as { symbol: string };
        await fastify.commodityService.deleteCommodity(symbol);
        return { success: true };
    });

    fastify.post('/commodities/sync', {
        schema: {
            description: 'Синхронизировать все цены сырьевых товаров',
            tags: ['Admin'],
            response: {
                200: z.object({ success: z.boolean(), updated: z.number(), errors: z.array(z.string()) })
            }
        }
    }, async () => {
        const result = await fastify.commodityService.syncAllPrices();
        return result;
    });

    fastify.post('/commodities/:symbol/sync', {
        schema: {
            description: 'Синхронизировать цену одного сырьевого товара',
            tags: ['Admin'],
            params: z.object({ symbol: z.string() }),
            response: {
                200: z.object({ success: z.boolean(), price: z.number().optional() })
            }
        }
    }, async (req) => {
        const { symbol } = req.params as { symbol: string };
        const result = await fastify.commodityService.syncOnePrice(symbol);
        return result;
    });

    fastify.get('/commodities/logs', {
        schema: {
            description: 'Получить логи синхронизации сырьевых товаров',
            tags: ['Admin'],
            querystring: z.object({
                limit: z.string().optional().transform(v => v ? parseInt(v) : 50)
            }),
            response: {
                200: z.array(z.object({
                    id: z.number(),
                    status: z.string(),
                    source: z.string().nullable(),
                    message: z.string(),
                    createdAt: z.date()
                }))
            }
        }
    }, async (req) => {
        const { limit } = req.query as { limit: number };
        return prisma.parsingLog.findMany({
            where: { source: 'commodities' },
            orderBy: { createdAt: 'desc' },
            take: limit
        });
    });

}
