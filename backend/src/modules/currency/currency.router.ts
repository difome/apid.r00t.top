import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { CreateCurrencySchema } from './dto/create-currency.dto';
import { ConvertSchema } from './currency.schema';

const rateExample = {
    rate: 64045.965,
    change: {
        absolute: 76.95,
        percent: 0.12,
        direction: 'up' as const
    }
};

const currencySymbolExample = {
    name: 'USD',
    symbol: '$',
    emoji: '$',
    description: 'USD'
};

export const currencyRouter: FastifyPluginAsyncZod = async (fastify) => {
    fastify.get('/rates', {
        schema: {
            summary: 'Курсы валют (Legacy)',
            description: 'Получает все курсы фиатных и криптовалют в устаревшем формате (объект ключей). Используется для обратной совместимости. \n\n**Параметры:**\n* `refresh` (boolean) — если `true` или `1`, принудительно запустит парсер перед отдачей результатов (может увеличить время ответа).',
            tags: ['Currency'],
            querystring: z.object({
                refresh: z.string().optional().default('0').describe('Принудительное обновление кэша (1 или true)').transform(v => v === '1' || v === 'true')
            }),
            response: {
                200: z.object({
                    success: z.boolean(),
                    data: z.record(z.string(), z.any()),
                    currency_symbols: z.record(z.string(), z.any()),
                    actual_date: z.string(),
                    cache_used: z.boolean(),
                    has_24h_comparison: z.boolean()
                })
            }
        }
    }, async (req) => {
        const { refresh } = req.query as { refresh: boolean };
        if (refresh) {
            await fastify.parserService.run();
        }
        return fastify.currencyService.getLegacyRates(refresh);
    });

    fastify.get('/currencies', {
        schema: {
            summary: 'Список поддерживаемых валют',
            description: 'Возвращает массивы ключей и объекты с метаданными (название, эмодзи, символ) для всех фиатных и криптовалют, которые сейчас есть в системе.',
            tags: ['Currency'],
            response: {
                200: z.object({
                    supported_currencies: z.array(z.string()),
                    currencies: z.record(z.string(), z.object({
                        name: z.string(),
                        symbol: z.string(),
                        emoji: z.string(),
                        description: z.string()
                    }))
                })
            }
        }
    }, async () => {
        return fastify.currencyService.getSupportedCurrencies();
    });

    fastify.get('/rates/list', {
        schema: {
            summary: 'Курсы валют (Массив)',
            description: 'Получает список всех валютных пар в виде массива (идеально для таблиц на фронтенде). Содержит текущую цену и процент изменения за 24 часа. \n\n**Параметры:**\n* `refresh` (boolean) — если `true`, принудительно обновит курсы перед отдачей.',
            tags: ['Currency'],
            querystring: z.object({
                refresh: z.string().optional().default('0').describe('Принудительное обновление кэша (1 или true)').transform(v => v === '1' || v === 'true')
            }),
            response: {
                200: z.object({
                    success: z.boolean(),
                    data: z.array(z.any())
                })
            }
        }
    }, async (req) => {
        const { refresh } = req.query as { refresh: boolean };
        if (refresh) {
            await fastify.parserService.run();
        }
        const currencies = await fastify.currencyService.getAllCurrencies();
        return { success: true, data: currencies };
    });

    fastify.get('/rates/stream', {
        schema: {
            summary: 'SSE поток курсов валют',
            description: 'Эндпоинт для Server-Sent Events (SSE). Подключившись к нему, вы будете получать обновления курсов валют в реальном времени каждую минуту (в формате JSON). \n\n*Примечание:* не работает через Swagger "Try it out", используйте EventSource в JS.',
            tags: ['Currency']
        }
    }, async (req, reply) => {
        reply.raw.setHeader('Content-Type', 'text/event-stream');
        reply.raw.setHeader('Cache-Control', 'no-cache');
        reply.raw.setHeader('Connection', 'keep-alive');
        reply.raw.setHeader('Access-Control-Allow-Origin', '*');
        reply.raw.flushHeaders();

        const sendRates = async () => {
            try {
                const currencies = await fastify.currencyService.getAllCurrencies();
                reply.raw.write(`data: ${JSON.stringify({ success: true, data: currencies })}\n\n`);
            } catch (error) {
                console.error('SSE Error:', error);
            }
        };

        // Send immediately
        await sendRates();

        // Send every 30 seconds (or listen to a redis pub/sub if available, but interval is easiest for now)
        const interval = setInterval(sendRates, 30000);

        req.raw.on('close', () => {
            clearInterval(interval);
            reply.raw.end();
        });
        
        // Fastify requires us to return reply to keep the connection open for manual handling,
        // or just don't resolve the promise immediately.
        // The proper way in fastify to keep connection open without hanging the request lifecycle forever
        // is to return reply.
        return reply;
    });

    fastify.post('/convert', {
        schema: {
            summary: 'Конвертер валют',
            description: 'Конвертирует переданную сумму из одной валюты в несколько других одновременно. Использует актуальные курсы из кэша. \n\n**Параметры:**\n* `amount` (число) — сколько конвертируем (например, `100`)\n* `from_currency` (строка) — из какой валюты (например, `"usd"`)\n* `to_currencies` (массив строк) — в какие валюты (например, `["rub", "eur", "uah"]`)\n* `exclude_source` (boolean) — если `true`, исходная валюта не вернется в результатах (по умолчанию `true`).',
            tags: ['Currency'],
            querystring: z.object({
                refresh: z.string().optional().default('0').describe('Принудительное обновление кэша (1 или true)').transform(v => v === '1' || v === 'true')
            }),
            body: ConvertSchema,
            response: {
                200: z.object({
                    success: z.boolean(),
                    data: z.record(z.string(), z.any()),
                    actual_date: z.string(),
                    cache_used: z.boolean()
                })
            }
        }
    }, async (req) => {
        const { refresh } = req.query as { refresh: boolean };
        if (refresh) {
            await fastify.parserService.run();
        }
        const { amount, from_currency, to_currencies, exclude_source } = req.body;
        const { results, actualDate } = await fastify.currencyService.convert(
            amount, 
            from_currency, 
            to_currencies, 
            exclude_source
        );
        return { 
            success: true, 
            data: results,
            actual_date: actualDate,
            cache_used: !refresh 
        };
    });

    fastify.post('/rates/sync', {
        preHandler: [fastify.authenticateAdmin],
        schema: {
            summary: 'Принудительная синхронизация (Admin)',
            description: 'Запускает процесс парсинга и обновления всех курсов валют в фоновом режиме. Доступно только администраторам (требуется `x-admin-key`).',
            tags: ['Admin'],
            response: {
                200: z.object({
                    success: z.boolean(),
                    message: z.string()
                })
            }
        }
    }, async () => {
        fastify.parserService.run().catch(console.error);
        return { success: true, message: 'Sync process started in background' };
    });

    fastify.get('/rates/:key/history', {
        schema: {
            summary: 'История изменения курса',
            description: 'Получает исторические данные для построения графиков по конкретной валютной паре. Поддерживает выборку за период (в днях), за конкретный год, или между произвольными датами.\n\n**Параметры:**\n* `key` (строка) — ключ пары (например, `"usd_rub"`)\n* `days` (число) — количество дней (например, `30`, `90`, `365`)\n* `year` (число) — конкретный год (например, `2024`)\n* `startDate` / `endDate` (строка) — произвольные даты в формате `YYYY-MM-DD`.',
            tags: ['Currency'],
            params: z.object({
                key: z.string().default('usd_rub').describe('Ключ валютной пары (например: usd_rub, btc_to_usd)')
            }),
            querystring: z.object({
                days: z.string().optional().default('30').describe('Период выборки (в днях), например 7, 30, 90, 365, max').transform(v => {
                    if (!v) return 30;
                    const clean = v.toLowerCase().trim();
                    if (clean === '1d' || clean === '1') return 1;
                    if (clean === '7d' || clean === '7') return 7;
                    if (clean === '30d' || clean === '30') return 30;
                    if (clean === '90d' || clean === '90') return 90;
                    if (clean === '365d' || clean === '365' || clean === '1y' || clean === 'year') return 365;
                    const parsed = parseInt(clean);
                    return isNaN(parsed) ? 30 : parsed;
                }),
                year: z.string().optional().describe('Конкретный год для выборки (например 2024). Игнорирует параметр days').transform(v => v ? parseInt(v) : undefined)
            }),
            response: {
                200: z.object({
                    success: z.boolean(),
                    data: z.array(z.object({
                        price: z.number(),
                        createdAt: z.date()
                    }))
                })
            }
        }
    }, async (req, reply) => {
        const { key } = req.params as any;
        const { days, year } = req.query as any;
        const history = await fastify.currencyService.getHistory(key, days, year);
        return { success: true, data: history };
    });

    fastify.get('/rates/:key/years', {
        schema: {
            summary: 'Доступные годы истории',
            description: 'Возвращает массив годов (например, `[2024, 2023, 2022]`), за которые в базе данных есть исторические курсы по выбранной валютной паре. Используется для построения фильтров на графике.\n\n**Параметры:**\n* `key` (строка) — ключ пары (например, `"usd_rub"`).',
            tags: ['Currency'],
            params: z.object({
                key: z.string().default('usd_rub').describe('Ключ валютной пары')
            }),
            response: {
                200: z.object({
                    success: z.boolean(),
                    data: z.array(z.number())
                })
            }
        }
    }, async (req, reply) => {
        const { key } = req.params as any;
        const years = await fastify.currencyService.getAvailableYears(key);
        return { success: true, data: years };
    });

    fastify.post('/rates/add', {
        preHandler: [fastify.authenticateAdmin],
        schema: {
            summary: 'Добавить валютную пару (Admin)',
            description: 'Позволяет администратору вручную добавить новую валютную пару (фиат или крипту) в систему. После добавления система начнёт парсить её курс.\n\nТребуется заголовок `x-admin-key`.',
            tags: ['Admin'],
            params: z.object({}),
            body: CreateCurrencySchema,
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
        const newCurrency = await fastify.currencyService.addCurrency(req.body);
        return reply.status(201).send({ success: true, data: newCurrency });
    });

    fastify.get('/health', {
        schema: {
            summary: 'Healthcheck сервиса валют',
            description: 'Проверяет состояние сервиса валют: доступны ли курсы, когда было последнее обновление и сколько пар в базе.',
            tags: ['Currency'],
            response: {
                200: z.object({
                    status: z.string(),
                    message: z.string(),
                    last_update: z.string(),
                    currencies_available: z.number(),
                    has_24h_comparison: z.boolean()
                })
            }
        }
    }, async () => {
        const rates = await fastify.currencyService.getLegacyRates();
        
        let status = 'healthy';
        let message = 'Данные актуальны';
        
        if (rates.actual_date === 'N/A') {
            status = 'unknown';
            message = 'Не удалось определить время обновления';
        } else {
            try {
                const [datePart, timePart] = rates.actual_date.split(' ');
                const [d, m, y] = datePart.split('.').map(Number);
                const [H, M, S] = timePart.split(':').map(Number);
                const actualDate = new Date(y, m - 1, d, H, M, S);
                const ageMinutes = Math.floor((new Date().getTime() - actualDate.getTime()) / 60000);
                
                if (ageMinutes > 30) {
                    status = 'warning';
                    message = `Данные устарели (${ageMinutes} мин)`;
                } else {
                    message = `Данные актуальны (${ageMinutes} мин)`;
                }
            } catch (e) {
                status = 'unknown';
                message = 'Не удалось распарсить время обновления';
            }
        }

        return {
            status,
            message,
            last_update: rates.actual_date,
            currencies_available: Object.keys(rates.data).length,
            has_24h_comparison: rates.has_24h_comparison
        };
    });
};

export default currencyRouter;
