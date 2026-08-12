import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

export const moviesRouter: FastifyPluginAsyncZod = async (fastify) => {
    fastify.get('/', {
        schema: {
            summary: 'Случайный фильм',
            description: 'Выдает случайный фильм с высоким рейтингом для просмотра вечером. Возвращает название, год, жанр и краткое описание сюжета.\n\n**Параметры:**\n* `lang` (строка) — язык ответа (`ru` или `en`).',
            tags: ['Movies'],
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
        return fastify.movieService.getRandomMovie(lang);
    });
};

export default moviesRouter;
