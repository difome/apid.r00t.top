import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import crypto from 'crypto'
import { exec } from 'child_process'
import fs from 'fs'

interface RepoConfig {
  name: string
  dir: string
  script: string
  pm2Name: string
}

const REPOS: Record<string, RepoConfig> = {
  'difome/apid-fastif': {
    name: 'apid-fastify',
    dir: '/home/q/web/apid-fastif',
    script: 'deploy.sh',
    pm2Name: 'apid-fastify'
  },
  'difome/difome.r00t.top': {
    name: 'difome-social',
    dir: '/var/www/difome.r00t.top',
    script: 'deploy.sh',
    pm2Name: 'difome-social'
  }
}

function verifySignature(payload: string, signature: string, secret: string): boolean {
  if (!secret) return false
  const sig = 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(signature))
  } catch {
    return false
  }
}

export async function webhookRouter(fastify: FastifyInstance) {
  fastify.post('/github', async (request: FastifyRequest, reply: FastifyReply) => {
    const signature = request.headers['x-hub-signature-256'] as string
    const event = request.headers['x-github-event'] as string

    if (!signature) {
      return reply.status(400).send({ error: 'Missing signature' })
    }

    const secret: string = process.env.WEBHOOK_SECRET || ''
    const bodyStr = JSON.stringify(request.body)

    if (!verifySignature(bodyStr, signature, secret)) {
      return reply.status(403).send({ error: 'Invalid signature' })
    }

    if (event === 'ping') {
      return reply.send({ success: true, message: 'pong' })
    }

    if (event === 'push') {
      const body = request.body as any
      const repoFullName: string = body?.repository?.full_name || ''

      const repo = REPOS[repoFullName]
      if (!repo) {
        return reply.send({ success: false, error: 'Unknown repo: ' + repoFullName })
      }

      const cmd = 'cd ' + repo.dir + ' && bash ' + repo.script + ' 2>&1'
      exec(cmd, { timeout: 120000 }, (err, stdout, stderr) => {
        const now = new Date().toISOString()
        const log = '[' + now + '] ' + repo.name + ' deploy: ' + (err ? 'FAIL' : 'OK') + '\n' + stdout + (stderr ? '\nSTDERR:\n' + stderr : '')
        fs.appendFileSync('/tmp/webhook-deploy.log', log + '\n')
        console.log(log)
      })

      return reply.send({ success: true, message: repo.name + ' deploy started', repo: repo.name })
    }

    return reply.send({ success: true, message: 'Event ignored' })
  })
}
