FROM node:22-bookworm

WORKDIR /app

RUN npx playwright install-deps chromium

COPY package.json yarn.lock ./
RUN yarn install

COPY . .

RUN yarn prisma generate
RUN yarn build
RUN npx playwright install chromium

EXPOSE 3000

CMD ["yarn", "docker:start"]
