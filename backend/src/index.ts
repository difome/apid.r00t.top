import Fastify from 'fastify'
import cors from '@fastify/cors'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import formbody from '@fastify/formbody'
import dotenv from 'dotenv'
import fastifyStatic from '@fastify/static'
import path from 'path'
import fs from 'fs'

dotenv.config({ path: path.join(process.cwd(), '.env') })
dotenv.config({ path: path.join(process.cwd(), '../.env') })


import zodPlugin from '@/plugins/zod'
import redisPlugin from '@/plugins/redis'
import servicesPlugin from '@/plugins/services'
import authPlugin from '@/plugins/auth'
import hooksPlugin from '@/plugins/hooks'
import cronPlugin from '@/plugins/cron'
import swaggerPlugin from '@/plugins/swagger'

import { currencyRouter } from '@/modules/currency/currency.router'
import { adminRouter } from '@/modules/admin/admin.router'
import { holidaysRouter } from '@/modules/holidays/holidays.router'
import { moviesRouter } from '@/modules/movies/movies.router'
import { memesRouter } from '@/modules/memes/memes.router'
import { factsRouter } from '@/modules/facts/facts.router'
import { commodityRouter } from '@/modules/commodities/commodity.router'
import { webhookRouter } from '@/modules/webhook/webhook.router'

const fastify = Fastify({ 
    logger: true,
    trustProxy: true,
    routerOptions: {
        ignoreTrailingSlash: true,
        maxParamLength: 500
    }
}).withTypeProvider<ZodTypeProvider>()

await fastify.register(zodPlugin)
await fastify.register(cors, { origin: true })
await fastify.register(formbody)

await fastify.register(redisPlugin)
await fastify.register(servicesPlugin)
await fastify.register(authPlugin)
await fastify.register(swaggerPlugin)

await fastify.register(hooksPlugin)
await fastify.register(cronPlugin)

fastify.addContentTypeParser('text/plain', { parseAs: 'string' }, (req, body, done) => {
    done(null, body)
})

await fastify.register(currencyRouter, { prefix: '/api/v2/currency' })
await fastify.register(adminRouter, { prefix: '/api/v2/admin' })
await fastify.register(holidaysRouter, { prefix: '/api/v2/holidays' })
await fastify.register(holidaysRouter, { prefix: '/api/holidays' })
await fastify.register(moviesRouter, { prefix: '/api/v2/movies' })
await fastify.register(moviesRouter, { prefix: '/api/v2/movie' })
await fastify.register(memesRouter, { prefix: '/api/v2/memes' })
await fastify.register(memesRouter, { prefix: '/api/v2/meme' })
await fastify.register(factsRouter, { prefix: '/api/v2/facts' })
await fastify.register(factsRouter, { prefix: '/api/v2/fact' })
await fastify.register(commodityRouter, { prefix: '/api/v2/commodities' })
await fastify.register(webhookRouter, { prefix: '/api/v2/webhook' })

const candidateDistPaths = [
    path.join(process.cwd(), '../frontend/dist'),
    path.join(process.cwd(), 'frontend/dist'),
    path.join(process.cwd(), 'dist/frontend'),
    path.join(process.cwd(), 'apid-frontend/dist'),
]
const frontendDistPath = candidateDistPaths.find(p => fs.existsSync(p))
if (frontendDistPath) {
    await fastify.register(fastifyStatic, {
        root: frontendDistPath,
        prefix: '/',
    })

    fastify.setNotFoundHandler(async (request, reply) => {
        const url = request.raw.url || ''
        if (url.startsWith('/api/') || url.startsWith('/assets/')) {
            reply.code(404).send({ success: false, error: 'Not Found' })
            return
        }
        return reply.sendFile('index.html')
    })
}

const start = async () => {
    try {
        await fastify.ready()
        const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000
        await fastify.listen({ port, host: '0.0.0.0' })
        console.log(`🚀 Server running at ${process.env.API_URL || `http://0.0.0.0:${port}`}`)
        console.log(`🚀 Server documentation available at ${process.env.API_URL || `http://0.0.0.0:${port}`}/docs`)
    } catch (err) {
        fastify.log.error(err)
        process.exit(1)
    }
}

start()
