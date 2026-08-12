import fp from 'fastify-plugin'
import { FastifyInstance } from 'fastify'
import Redis from 'ioredis'

declare module 'fastify' {
    interface FastifyInstance {
        redis: Redis
    }
}

export default fp(async (fastify: FastifyInstance) => {
    const redis = new Redis({
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: Number(process.env.REDIS_PORT) || 6379,
        connectTimeout: 5000,
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
            const delay = Math.min(times * 50, 2000);
            return delay;
        }
    })

    redis.on('error', (err) => {
        fastify.log.error(`Redis connection error: ${err.message || 'Unknown error'}`)
    })

    redis.on('connect', () => {
        fastify.log.info('🚀 Redis connected successfully')
    })

    fastify.decorate('redis', redis)

    fastify.addHook('onClose', async () => {
        await redis.quit()
    })
})
