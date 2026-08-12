#!/bin/bash
# Автодеплой: git pull → install → build frontend → prisma → pm2 restart
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

echo "🔄 Pulling latest from main..."
git pull origin main

echo "📦 Installing backend deps..."
cd "$DIR/backend"
yarn install

echo "🗄️ Prisma..."
npx prisma generate
npx prisma migrate deploy

echo "📦 Building frontend..."
if [ -d "$DIR/frontend" ]; then
    cd "$DIR/frontend"
    yarn install
    yarn build || echo "⚠️ Frontend build skipped"
fi

echo "🚀 Restarting pm2..."
cd "$DIR/backend"
pm2 restart apid-fastify --update-env || pm2 start "yarn start" --name apid-fastify

echo "✅ Deploy done!"
pm2 logs apid-fastify --lines 5 --nostream
