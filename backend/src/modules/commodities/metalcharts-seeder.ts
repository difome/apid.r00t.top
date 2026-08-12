import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
import https from 'https';

const AUTH_FILE = path.join(process.cwd(), 'mc_auth.json');
const API_URL = "https://metalcharts.org/api/prices";
const TIMEOUT = 20000;

async function getAuthViaPlaywright() {
    console.log("[*] Getting fresh auth via Playwright...");
    const browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext({
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36"
    });
    const page = await ctx.newPage();
    let token = "";

    page.on('response', response => {
        if (response.url().includes('/api/prices')) {
            const reqToken = response.request().headers()['x-mc-token'];
            if (reqToken) token = reqToken;
        }
    });

    try {
        await page.goto("https://metalcharts.org/", { waitUntil: "networkidle", timeout: TIMEOUT });
    } catch (e) {
        console.log("Goto timeout or error, proceeding anyway:", e);
    }

    const cookiesArr = await ctx.cookies();
    const cookies = cookiesArr.reduce((acc, c) => {
        acc[c.name] = c.value;
        return acc;
    }, {} as Record<string, string>);

    await browser.close();

    return {
        cookies,
        token,
        timestamp: Date.now()
    };
}

function loadAuth() {
    if (fs.existsSync(AUTH_FILE)) {
        try {
            const data = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
            if (Date.now() - data.timestamp < 10 * 60 * 1000) { // 10 mins
                return data;
            }
        } catch (e) { }
    }
    return null;
}

function saveAuth(auth: any) {
    fs.writeFileSync(AUTH_FILE, JSON.stringify(auth, null, 2));
}

async function ensureAuth() {
    let auth = loadAuth();
    if (!auth || !auth.token) {
        auth = await getAuthViaPlaywright();
        if (auth.token) saveAuth(auth);
    }
    return auth;
}

async function fetchPrices(auth: any, url: string) {
    const cookieStr = Object.entries(auth.cookies).map(([k, v]) => `${k}=${v}`).join('; ');

    return new Promise((resolve, reject) => {
        const req = https.get(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Cookie": cookieStr,
                "x-mc-token": auth.token,
                "x-requested-with": "XMLHttpRequest",
                "Referer": "https://metalcharts.org/",
                "Accept": "application/json, text/plain, */*",
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

const TRANSLATIONS: Record<string, { en: string, ru: string, uk: string }> = {
    // Metals
    'XAU': { en: 'Gold', ru: 'Золото', uk: 'Золото' },
    'XAG': { en: 'Silver', ru: 'Серебро', uk: 'Срібло' },
    'XPT': { en: 'Platinum', ru: 'Платина', uk: 'Платина' },
    'XPD': { en: 'Palladium', ru: 'Палладий', uk: 'Паладій' },
    'HG': { en: 'Copper', ru: 'Медь', uk: 'Мідь' },
    'ALI': { en: 'Aluminum', ru: 'Алюминий', uk: 'Алюміній' },
    'NI': { en: 'Nickel', ru: 'Никель', uk: 'Нікель' },
    'ZN': { en: 'Zinc', ru: 'Цинк', uk: 'Цинк' },
    'PB': { en: 'Lead', ru: 'Свинец', uk: 'Свинець' },
    'SN': { en: 'Tin', ru: 'Олово', uk: 'Олово' },
    'LC': { en: 'Lithium', ru: 'Литий', uk: 'Літій' },
    'UXA': { en: 'Uranium', ru: 'Уран', uk: 'Уран' },
    'JBP': { en: 'Steel', ru: 'Сталь', uk: 'Сталь' },
    
    // Commodities
    'CL1': { en: 'Crude Oil', ru: 'Нефть', uk: 'Нафта' },
    'CO1': { en: 'Brent', ru: 'Нефть Brent', uk: 'Нафта Brent' },
    'NG/USD': { en: 'Natural Gas', ru: 'Природный газ', uk: 'Природний газ' },
    'XB1': { en: 'Gasoline', ru: 'Бензин', uk: 'Бензин' },
    'W_1': { en: 'Wheat', ru: 'Пшеница', uk: 'Пшениця' },
    'KC1': { en: 'Coffee', ru: 'Кофе', uk: 'Кава' },
    'CC1': { en: 'Cocoa', ru: 'Какао', uk: 'Какао' },
    'C_1': { en: 'Corn', ru: 'Кукуруза', uk: 'Кукурудза' },
    'S_1': { en: 'Soybeans', ru: 'Соевые бобы', uk: 'Соєві боби' },
    'SB1': { en: 'Sugar', ru: 'Сахар', uk: 'Цукор' },
    'CT1': { en: 'Cotton', ru: 'Хлопок', uk: 'Бавовна' },
    'LH1': { en: 'Lean Hogs', ru: 'Свинина', uk: 'Свинина' },
    'LC1': { en: 'Live Cattle', ru: 'Живой скот', uk: 'Жива худоба' },
    'O_1': { en: 'Oat', ru: 'Овес', uk: 'Овес' },
    'RR1': { en: 'Rice', ru: 'Рис', uk: 'Рис' },
    'JO1': { en: 'Orange Juice', ru: 'Апельсиновый сок', uk: 'Апельсиновий сік' },
    'FC1': { en: 'Feeder Cattle', ru: 'Скот на откорме', uk: 'Худоба на відгодівлі' },
    'RS1': { en: 'Canola', ru: 'Канола', uk: 'Канола' },
    'LB1': { en: 'Lumber', ru: 'Древесина', uk: 'Деревина' },
    'DL1': { en: 'Ethanol', ru: 'Этанол', uk: 'Етанол' },
    'DA': { en: 'Milk', ru: 'Молоко', uk: 'Молоко' },
    'CHE': { en: 'Cheese', ru: 'Сыр', uk: 'Сир' },
};

async function processData(auth: any, url: string, category: string) {
    try {
        let res: any = await fetchPrices(auth, url);
        if (!res.success) throw new Error("API not success");

        console.log(`Data received for ${category}:`, Object.keys(res.data));
        
        const items = Array.isArray(res.data) ? res.data : (res.data.items || []);
        
        for (const info of items) {
            const sym = info.symbol || info.ticker || info.code;
            if (!sym) continue;

            const price = info.price || info.currentPrice || info.rate;
            const changePercent24h = info.changePercent24h || info.changePercent || info.percentChange || 0;
            
            if (!price) continue;

            const t = TRANSLATIONS[sym] || { en: info.name || sym, ru: info.name || sym, uk: info.name || sym };

            const c = await prisma.commodity.upsert({
                where: { symbol: sym },
                create: {
                    symbol: sym,
                    name: t.en,
                    nameRu: t.ru,
                    nameUa: t.uk,
                    category: category,
                    unit: 'oz',
                    source: 'metalcharts',
                    enabled: true,
                    order: 0
                },
                update: {
                    name: t.en,
                    nameRu: t.ru,
                    nameUa: t.uk,
                    category: category,
                    source: 'metalcharts'
                }
            });

            if (c) {
                await prisma.commodityRate.create({
                    data: {
                        commodityId: c.id,
                        price,
                        changePercent24h,
                        createdAt: new Date()
                    }
                });
                console.log(`Saved ${category} ${sym}: ${price}`);
            }
        }
        return true;
    } catch (e) {
        console.error(`Failed to process ${category}`, e);
        return false;
    }
}

async function main() {
    let auth = await ensureAuth();

    const targets = [
        { url: "https://metalcharts.org/api/metals?sort=default&order=desc", category: "metals" },
        { url: "https://metalcharts.org/api/commodities?sort=relevance&order=asc", category: "commodities" }
    ];

    for (const target of targets) {
        let success = await processData(auth, target.url, target.category);
        if (!success) {
            console.log("Retrying auth...");
            auth = await getAuthViaPlaywright();
            saveAuth(auth);
            await processData(auth, target.url, target.category);
        }
    }
    
    await prisma.$disconnect();
}

main().catch(e => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
});
