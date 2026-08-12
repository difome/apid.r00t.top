import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

export const factsRouter: FastifyPluginAsyncZod = async (fastify) => {
    fastify.get('/', {
        schema: {
            summary: 'Случайный факт',
            description: 'Генерирует и возвращает интересный случайный факт обо всем на свете (наука, история, животные и т.д.). Отлично подходит для развлекательных ботов или виджетов.\n\n**Параметры:**\n* `lang` (строка) — язык ответа (`ru` или `en`).',
            tags: ['Facts'],
            querystring: z.object({
                lang: z.string().optional().default('ru').describe('Язык ответа (ru или en)')
            }),
            response: {
                200: z.object({
                    success: z.boolean(),
                    data: z.object({
                        result: z.any(),
                        message: z.string()
                    })
                })
            }
        }
    }, async (req) => {
        const { lang } = req.query as { lang: string };
        return fastify.factService.getRandomFact(lang);
    });
};

export default factsRouter;
