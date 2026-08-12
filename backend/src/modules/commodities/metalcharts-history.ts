import { chromium } from 'playwright';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
const AUTH_FILE = path.join(process.cwd(), 'mc_auth.json');

async function getAuthViaPlaywright() {
    console.log("[*] Getting fresh auth via Playwright...");
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
    });
    const page = await context.newPage();

    let mcToken = '';
    
    page.on('request', req => {
        const token = req.headers()['x-mc-token'];
        if (token && !mcToken) mcToken = token;
    });

    try {
        await page.goto('https://metalcharts.org/', { waitUntil: 'domcontentloaded', timeout: 20000 });
        let waitTime = 0;
        while (!mcToken && waitTime < 10000) {
            await new Promise(resolve => setTimeout(resolve, 500));
            waitTime += 500;
        }
    } catch (e: any) {
        console.log("Goto timeout or error, proceeding anyway:", e.message);
    }

    const cookies = await context.cookies();
    const cookieObj: Record<string, string> = {};
    for (const c of cookies) cookieObj[c.name] = c.value;

    await browser.close();

    if (!mcToken) {
        throw new Error("Failed to extract x-mc-token");
    }

    return {
        cookies: cookieObj,
        token: mcToken,
        timestamp: Date.now()
    };
}

function loadAuth() {
    if (fs.existsSync(AUTH_FILE)) {
        try {
            const data = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
            if (Date.now() - data.timestamp < 1000 * 60 * 30) { 
                return data;
            }
        } catch (e) {}
    }
    return null;
}

function saveAuth(auth: any) {
    fs.writeFileSync(AUTH_FILE, JSON.stringify(auth, null, 2));
}

async function ensureAuth() {
    let auth = loadAuth();
    if (!auth) {
        auth = await getAuthViaPlaywright();
        saveAuth(auth);
    }
    return auth;
}

async function fetchHistory(auth: any, symbol: string, category: string) {
    const cookieStr = Object.entries(auth.cookies).map(([k, v]) => `${k}=${v}`).join('; ');
    
    // NG/USD -> ng%2Fusd or similar if needed. We'll use encodeURIComponent.
    const safeSymbol = encodeURIComponent(symbol.toLowerCase());
    
    let url = '';
    if (category === 'commodities') {
        url = `https://metalcharts.org/api/commodities/${safeSymbol}/history?range=ALL&interval=1d`;
    } else {
        url = `https://metalcharts.org/api/history/${symbol}?range=ALL&interval=1d`;
    }

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
                    reject(new Error(`Parse error for ${symbol}: ` + data.slice(0, 100)));
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

async function main() {
    let auth = await ensureAuth();

    const commodities = await prisma.commodity.findMany({
        where: { source: 'metalcharts' }
    });

    for (const c of commodities) {
        let res: any;
        try {
            res = await fetchHistory(auth, c.symbol, c.category);
            if (res.error) {
                console.log("Token expired or error, refreshing auth...");
                auth = await getAuthViaPlaywright();
                saveAuth(auth);
                res = await fetchHistory(auth, c.symbol, c.category);
            }
        } catch (e: any) {
            console.error(`Failed to fetch history for ${c.symbol}:`, e.message);
            continue;
        }

        // Expected format: Array of [timestamp_ms, price] or { data: [[ts, p], ...] }
        let historyData: any[] = [];
        if (Array.isArray(res)) historyData = res;
        else if (res.data && Array.isArray(res.data)) historyData = res.data;
        else if (res.items && Array.isArray(res.items)) historyData = res.items;

        if (historyData.length === 0) {
            console.log(`No history found for ${c.symbol}. Object keys:`, Object.keys(res));
            continue;
        }

        console.log(`Processing ${historyData.length} history records for ${c.symbol}...`);
        console.log(`FIRST ITEM FOR ${c.symbol}:`, JSON.stringify(historyData[0]));

        // Prepare data for bulk insert
        const rates = historyData.map((item: any) => {
            let ts, price;
            if (Array.isArray(item)) {
                ts = item[0];
                price = item[1];
            } else {
                ts = item.timestamp || item.time || item.t || item.date || item.createdAt;
                price = item.price || item.p || item.value || item.close || item.c;
            }
            if (!ts || price === undefined) return null;
            return {
                commodityId: c.id,
                price: Number(price),
                createdAt: new Date(ts)
            };
        }).filter(Boolean);

        if (rates.length > 0) {
            await prisma.commodityRate.deleteMany({ where: { commodityId: c.id } });
            
            const batchSize = 3000; // SQLite max variables is 32766. 3000*3 = 9000 variables
            for (let i = 0; i < rates.length; i += batchSize) {
                const batch = rates.slice(i, i + batchSize);
                await prisma.commodityRate.createMany({ data: batch as any });
            }
            console.log(`✅ Successfully saved ${rates.length} rates for ${c.symbol}`);
        }
    }
    
    await prisma.$disconnect();
}

main().catch(console.error);
