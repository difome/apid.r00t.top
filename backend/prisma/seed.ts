import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from '../src/generated/prisma/client'

const adapter = new PrismaMariaDb({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    connectionLimit: 5,
});
const prisma = new PrismaClient({ adapter });

const COINBASE_SLUGS: Record<string, string> = {
    'btc_to_usd': 'bitcoin',
    'eth_to_usd': 'ethereum',
    'sol_to_usd': 'solana',
    'usdt_to_usd': 'tether',
    'ton_to_usd': 'toncoin',
    'xau_to_usd': 'pax-gold'
};

const currencyTranslations: Record<string, { symbol: string, emoji: string, ru: string, uk: string }> = {
    'TON': { symbol: 'TON', emoji: '💎', ru: 'Тонкоин', uk: 'Тонкоїн' },
    'USD': { symbol: '$', emoji: '💵', ru: 'Доллар США', uk: 'Долар США' },
    'RUB': { symbol: '₽', emoji: '🇷🇺', ru: 'Российский рубль', uk: 'Російський рубль' },
    'UAH': { symbol: '₴', emoji: '🇺🇦', ru: 'Украинская гривна', uk: 'Українська гривня' },
    'KZT': { symbol: '₸', emoji: '🇰🇿', ru: 'Казахстанский тенге', uk: 'Казахстанський тенге' },
    'BYN': { symbol: 'Br', emoji: '🇧🇾', ru: 'Белорусский рубль', uk: 'Білоруський рубль' },
    'EUR': { symbol: '€', emoji: '🇪🇺', ru: 'Евро', uk: 'Євро' },
    'BTC': { symbol: '₿', emoji: '₿', ru: 'Биткоин', uk: 'Біткоїн' },
    'ETH': { symbol: 'Ξ', emoji: 'Ξ', ru: 'Эфириум', uk: 'Ефіріум' },
    'USDT': { symbol: '₮', emoji: '💵', ru: 'Tether (USDT)', uk: 'Tether (USDT)' },
    'SOL': { symbol: '☀️', emoji: '☀️', ru: 'Солана', uk: 'Солана' },
    'CNY': { symbol: '¥', emoji: '🇨🇳', ru: 'Китайский юань', uk: 'Китайський юань' },
    'XAU': { symbol: 'Au', emoji: '🪙', ru: 'Золото', uk: 'Золото' },
    'GBP': { symbol: '£', emoji: '🇬🇧', ru: 'Британский фунт', uk: 'Британський фунт' },
};

const pairs = {
    "ton_to_usd": { base: "TON", target: "USD", type: "crypto", source: "coinbase" },
    "usd_to_rub": { base: "USD", target: "RUB", type: "fiat", source: "cbr" },
    "usd_to_uah": { base: "USD", target: "UAH", type: "fiat", source: "minfin" },
    "usd_to_kzt": { base: "USD", target: "KZT", type: "fiat", source: "cbr" },
    "usd_to_byn": { base: "USD", target: "BYN", type: "fiat", source: "cbr" },
    "usd_to_eur": { base: "USD", target: "EUR", type: "fiat", source: "cbr" },
    "usd_to_cny": { base: "USD", target: "CNY", type: "fiat", source: "cbr" },
    "btc_to_usd": { base: "BTC", target: "USD", type: "crypto", source: "coinbase" },
    "eth_to_usd": { base: "ETH", target: "USD", type: "crypto", source: "coinbase" },
    "usdt_to_usd": { base: "USDT", target: "USD", type: "crypto", source: "coinbase" },
    "sol_to_usd": { base: "SOL", target: "USD", type: "crypto", source: "coinbase" },
    "xau_to_usd": { base: "XAU", target: "USD", type: "fiat", source: "coinbase" },
    "usd_to_gbp": { base: "USD", target: "GBP", type: "fiat", source: "cbr" }
};

async function main() {
    console.log('🌱 Starting seed with translations...')
    
    for (const [key, config] of Object.entries(pairs)) {
        const baseInfo = currencyTranslations[config.base];
        const targetInfo = currencyTranslations[config.target];
        
        const mainCurrency = config.base === 'USD' ? config.target : config.base;
        const mainInfo = currencyTranslations[mainCurrency];

        const params: Record<string, any> = {
            translation: {
                base: {
                    ru: baseInfo?.ru || config.base,
                    uk: baseInfo?.uk || config.base
                },
                target: {
                    ru: targetInfo?.ru || config.target,
                    uk: targetInfo?.uk || config.target
                }
            }
        };

        if (config.source === 'coinbase' && COINBASE_SLUGS[key]) {
            params.slug = COINBASE_SLUGS[key];
        }

        await prisma.currency.upsert({
            where: { key },
            update: {
                symbol: mainInfo?.symbol || config.target,
                emoji: mainInfo?.emoji || '',
                params: params as any,
            },
            create: {
                key,
                name: `${config.base}/${config.target}`,
                type: config.type,
                source: config.source,
                baseCurrency: config.base,
                targetCurrency: config.target,
                symbol: mainInfo?.symbol || config.target,
                emoji: mainInfo?.emoji || '',
                enabled: true,
                order: 0,
                params: params as any,
            }
        });
    }

    console.log('✅ Seed finished.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
