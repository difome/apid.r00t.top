import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

const toSafeBase64 = (str: string) => {
    return Buffer.from(str)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
};

const fromSafeBase64 = (str: string) => {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
        base64 += '=';
    }
    return Buffer.from(base64, 'base64').toString('utf-8');
};

export const memesRouter: FastifyPluginAsyncZod = async (fastify) => {
    fastify.get('/', {
        schema: {
            summary: 'Случайный мем',
            description: 'Парсит и возвращает свежий случайный мем (картинку и текстовое описание) с популярных ресурсов (например, anekdot.me). \n\n**Особенность:** Возвращаемый URL картинки пропускается через наш внутренний прокси, поэтому он никогда не блокируется в Telegram или других мессенджерах!',
            tags: ['Memes'],
            response: {
                200: z.object({
                    success: z.boolean(),
                    data: z.object({
                        result: z.object({
                            image: z.string(),
                            description: z.string(),
                            source: z.string()
                        })
                    })
                })
            }
        }
    }, async (request, reply) => {
        const meme = await fastify.memeService.getRandomMeme();
        const forwardedProto = request.headers['x-forwarded-proto'];
        const forwardedHost = request.headers['x-forwarded-host'];
        const host = typeof forwardedHost === 'string' ? forwardedHost : (typeof request.headers.host === 'string' ? request.headers.host : request.hostname);
        const protocol = typeof forwardedProto === 'string' ? forwardedProto : request.protocol;
        const isLocalInternal = host.includes('127.0.0.1') || host.includes('localhost');
        const baseUrl = process.env.API_URL || (isLocalInternal ? '' : `${protocol}://${host}`);
        const encodedUrl = toSafeBase64(meme.data.result.image);
        meme.data.result.image = `${baseUrl}/api/v2/memes/image-proxy/${encodedUrl}/meme.jpg`;
        return meme;
    });

    fastify.get('/image-proxy/:encodedUrl/meme.jpg', {
        schema: {
            summary: 'Прокси для картинок',
            description: 'Служебный эндпоинт. Принимает Base64-закодированный URL картинки мема, скачивает её на сервере и отдает клиенту напрямую как изображение (image/jpeg). Это позволяет обходить CORS и блокировки мессенджеров при отправке мемов ботами.',
            tags: ['Memes'],
            params: z.object({
                encodedUrl: z.string()
            })
        }
    }, async (request, reply) => {
        const { encodedUrl } = request.params;
        try {
            const url = fromSafeBase64(encodedUrl);
            const response = await fetch(url, {
                headers: {
                    "accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
                    "accept-language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
                    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                },
                signal: AbortSignal.timeout(6000)
            });
            if (!response.ok) {
                return reply.status(response.status).send(`Failed to fetch image: ${response.statusText}`);
            }
            let contentType = response.headers.get('content-type') || 'image/jpeg';
            if (!contentType.startsWith('image/')) {
                contentType = 'image/jpeg';
            }
            const buffer = Buffer.from(await response.arrayBuffer());
            
            reply.header('Cache-Control', 'public, max-age=86400');
            reply.type(contentType).send(buffer);
        } catch (error: any) {
            reply.status(500).send(`Error proxying image: ${error.message}`);
        }
    });
};

export default memesRouter;
