import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

export const holidaysRouter: FastifyPluginAsyncZod = async (fastify) => {
    fastify.get('/upcoming', {
        schema: {
            summary: 'Ближайшие праздники',
            description: 'Возвращает список ближайших праздников, начиная с сегодняшнего дня. Отлично подходит для виджетов.\n\n**Параметры:**\n* `lang` (строка) — язык (`ru` или `uk`)\n* `limit` (число) — сколько дней вперёд показать (по умолчанию 5).',
            tags: ['Holidays'],
            querystring: z.object({
                lang: z.string().optional().default('ru').describe('Язык ответа (ru или uk)'),
                limit: z.string().optional().default('5').describe('Количество дней вперед').transform(v => parseInt(v))
            }),
            response: {
                200: z.any()
            }
        }
    }, async (req) => {
        const { lang, limit } = req.query as { lang: string, limit: number };
        return fastify.holidayService.getUpcomingHolidays(limit, lang);
    });

    fastify.get('/list', {
        schema: {
            summary: 'Праздники сегодня (Legacy API v2)',
            description: 'Получает полный список праздников, примет, именин и событий на текущий день. Эндпоинт сохранен для обратной совместимости старых клиентов.\n\n**Параметры:**\n* `lang` (строка) — язык (`ru` или `uk`)\n* `refresh` (boolean) — если `true`, сбросит кэш и спарсит заново.',
            tags: ['Holidays'],
            querystring: z.object({
                lang: z.string().optional().default('ru').describe('Язык ответа (ru или uk)'),
                refresh: z.string().optional().default('0').describe('Принудительное обновление кэша (1 или true)').transform(v => v === '1' || v === 'true')
            }),
            response: {
                200: z.any()
            }
        }
    }, async (req) => {
        const { lang, refresh } = req.query as { lang: string, refresh: boolean };
        return fastify.holidayService.getHolidays(lang, refresh);
    });

    fastify.get('/today', {
        schema: {
            summary: 'Праздники сегодня',
            description: 'Основной метод для получения праздников, народных примет, именин и исторических событий на сегодняшний день.\n\n**Параметры:**\n* `lang` (строка) — язык (`ru` или `uk`)\n* `refresh` (boolean) — если `true`, принудительно обновит кэш.',
            tags: ['Holidays'],
            querystring: z.object({
                lang: z.string().optional().default('ru').describe('Язык ответа (ru или uk)'),
                refresh: z.string().optional().default('0').describe('Принудительное обновление кэша (1 или true)').transform(v => v === '1' || v === 'true')
            }),
            response: {
                200: z.any()
            }
        }
    }, async (req) => {
        const { lang, refresh } = req.query as { lang: string, refresh: boolean };
        return fastify.holidayService.getHolidays(lang, refresh);
    });

    fastify.get('/date/:month/:day', {
        schema: {
            summary: 'Праздники на любую дату',
            description: 'Позволяет посмотреть праздники на любой конкретный день в году (в прошлом или будущем).\n\n**Параметры:**\n* `month` (число) — месяц (1-12)\n* `day` (число) — день (1-31)\n* `lang` (строка) — язык (`ru` или `uk`).',
            tags: ['Holidays'],
            params: z.object({
                month: z.string().default('5').transform(v => parseInt(v)),
                day: z.string().default('17').transform(v => parseInt(v))
            }),
            querystring: z.object({
                lang: z.string().optional().default('ru').describe('Язык ответа (ru или uk)'),
                refresh: z.string().optional().default('0').describe('Принудительное обновление кэша (1 или true)').transform(v => v === '1' || v === 'true')
            }),
            response: {
                200: z.any()
            }
        }
    }, async (req) => {
        const { lang, refresh } = req.query as { lang: string, refresh: boolean };
        const { month, day } = req.params as { month: number, day: number };
        return fastify.holidayService.getHolidaysByDate(month, day, lang, refresh);
    });

    fastify.get('/:month/:day', {
        schema: {
            summary: 'Праздники на любую дату (Legacy)',
            description: 'Дублирует эндпоинт `/date/:month/:day` для совместимости со старыми Python-скриптами.',
            tags: ['Holidays'],
            params: z.object({
                month: z.string().default('5').transform(v => parseInt(v)),
                day: z.string().default('17').transform(v => parseInt(v))
            }),
            querystring: z.object({
                lang: z.string().optional().default('ru').describe('Язык ответа (ru или uk)'),
                refresh: z.string().optional().default('0').describe('Принудительное обновление кэша (1 или true)').transform(v => v === '1' || v === 'true')
            }),
            response: {
                200: z.any()
            }
        }
    }, async (req) => {
        const { lang, refresh } = req.query as { lang: string, refresh: boolean };
        const { month, day } = req.params as { month: number, day: number };
        return fastify.holidayService.getHolidaysByDate(month, day, lang, refresh);
    });
};

export default holidaysRouter;
