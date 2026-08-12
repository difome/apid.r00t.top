import fp from 'fastify-plugin'
import { FastifyInstance } from 'fastify'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

declare module 'fastify' {
    interface FastifyInstance {
        updateBansCache: () => Promise<void>
    }
}

export default fp(async (fastify: FastifyInstance) => {
    const REDIS_BAN_KEY = 'banned_ips';
    
    const localBannedIps = new Set<string>();

    async function syncBansToRedis() {
        try {
            const bans = await prisma.bannedIp.findMany({ select: { ip: true } });
            const ips = bans.map(b => b.ip);
            
            localBannedIps.clear();
            ips.forEach(ip => localBannedIps.add(ip));

            if (fastify.redis.status === 'ready') {
                await fastify.redis.del(REDIS_BAN_KEY);
                if (ips.length > 0) {
                    await fastify.redis.sadd(REDIS_BAN_KEY, ...ips);
                }
                fastify.log.info(`🚫 Synced ${ips.length} banned IPs to Redis`);
            }
        } catch (err: any) {
            fastify.log.error(`Failed to sync bans: ${err.message}`);
        }
    }

    fastify.addHook('onReady', () => {
        syncBansToRedis().catch((err: any) => {
            fastify.log.error(`Failed to sync bans after ready: ${err.message}`);
        });
    });

    fastify.decorate('updateBansCache', async () => {
        await syncBansToRedis();
    });

    fastify.addHook('onRequest', async (request, reply) => {
        const ip = request.headers['cf-connecting-ip'] as string || request.ip;
        
        try {
            if (fastify.redis.status === 'ready') {
                const isBanned = await fastify.redis.sismember(REDIS_BAN_KEY, ip);
                if (isBanned) {
                    return reply.status(403).send({ error: 'Your IP is banned', ip });
                }
            } else {
                if (localBannedIps.has(ip)) {
                    return reply.status(403).send({ error: 'Your IP is banned (cached)', ip });
                }
            }
        } catch (err) {
            if (localBannedIps.has(ip)) {
                return reply.status(403).send({ error: 'Your IP is banned (cached)', ip });
            }
        }

    });

    fastify.addHook('preValidation', async (request) => {
        if (request.body !== undefined && request.body !== null) {
            try {
                if (typeof request.body === 'string') {
                    (request as any)._storedBody = request.body;
                } else if (typeof request.body === 'object') {
                    (request as any)._storedBody = JSON.stringify(request.body);
                } else {
                    (request as any)._storedBody = String(request.body);
                }
            } catch (e) {
                (request as any)._storedBody = "[Error stringifying body]";
            }
        }
    });

    fastify.addHook('onResponse', async (request) => {
        const path = request.url;
        if (!path.startsWith('/api/v2/')) return;

        const ip = request.headers['cf-connecting-ip'] as string || request.ip;
        const ct = request.headers['content-type'] || 'no-ct';
        const userAgent = `${request.headers['user-agent'] || ''} [${ct}]`;
        const country = request.headers['cf-ipcountry'] as string;
        const city = request.headers['cf-ipcity'] as string;

        const query = request.query && Object.keys(request.query as object).length > 0 ? JSON.stringify(request.query) : null;
        const body = (request as any)._storedBody || null;

        prisma.apiRequestLog.create({
            data: {
                ip,
                method: request.method,
                path: path.split('?')[0],
                query,
                body: body && body !== '{}' ? body : null,
                userAgent,
                country: country !== 'XX' ? country : null,
                city,
            }
        }).catch((err: any) => fastify.log.error('Failed to log API request:', err));
    });

    fastify.setErrorHandler((error: any, request, reply) => {
        if (error instanceof z.ZodError) {
            return reply.status(400).send({
                success: false,
                message: 'Validation error',
                errors: error.flatten().fieldErrors
            })
        }
        request.log.error(error)
        return reply.status(error.statusCode || 500).send({
            success: false,
            message: error.message || 'Internal Server Error'
        })
    })
})
