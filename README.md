# APID

Сервіс, що складається з API-бекенду (Fastify) та клієнтського застосунку (React). 

## Стек технологій

**Backend:**
- Node.js, Fastify
- TypeScript
- MariaDB, Prisma ORM
- Redis (ioredis)
- Zod
- Playwright, Cheerio, Yahoo-Finance2
- Swagger

**Frontend:**
- React 19, Vite
- TypeScript
- TanStack Router, React Query
- Tailwind CSS v4, shadcn/ui, Radix UI
- i18next

## Локальний запуск

### Backend (`/backend`)
```bash
cd backend
yarn install
```
1. Створіть файл `.env` у корені проєкту:
```bash
cp .env.example .env
```
2. Підготовка БД та наповнення даними:
```bash
yarn prisma generate
yarn prisma db push
yarn seed
yarn seed:history
```
3. Запуск сервера:
```bash
yarn dev
```

### Frontend (`/frontend`)
```bash
cd frontend
yarn install
yarn dev
```

### Запуск через Docker

Запустити весь проект (Backend, Frontend, MariaDB, Redis) можна однією командою:

1. Створіть файл `.env` у корені проєкту:
```bash
cp .env.example .env
```
2. Виконайте в корені проєкту:
```bash
docker-compose up --build
```
- Backend API буде доступний за адресою, вказаною у `API_URL` (за замовчуванням порт 3000)
- Frontend буде доступний за адресою, вказаною у `FRONTEND_URL` (за замовчуванням порт 3001)
