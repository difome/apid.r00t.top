import fp from 'fastify-plugin'
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'

declare module 'fastify' {
    interface FastifyInstance {
        authenticateAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    }
}

export default fp(async (fastify: FastifyInstance) => {
    fastify.decorate('authenticateAdmin', async (request: FastifyRequest, reply: FastifyReply) => {
        const apiKey = request.headers['x-admin-key'];
        const adminKey = process.env.ADMIN_API_KEY;
        
        if (!adminKey || adminKey.trim() === '' || apiKey !== adminKey) {
            return reply.status(401).send({ 
                success: false, 
                message: 'Unauthorized: Admin access required' 
            });
        }
    });
})
