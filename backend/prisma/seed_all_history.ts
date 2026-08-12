import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from '../src/generated/prisma/client';

const adapter = new PrismaMariaDb({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    connectionLimit: 5,
});
const prisma = new PrismaClient({ adapter });

async function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const CBR_VAL_IDS: Record<string, string> = {
    'usd_to_rub': 'R01235',
    'usd_to_eur': 'R01239',
    'usd_to_cny': 'R01375',
    'usd_to_kzt': 'R01335',
    'usd_to_byn': 'R01090B',
    'usd_to_gbp': 'R01035'
};

const COINBASE_SLUGS: Record<string, string> = {
    'btc_to_usd': 'bitcoin',
    'eth_to_usd': 'ethereum',
    'sol_to_usd': 'solana',
    'usdt_to_usd': 'tether',
    'ton_to_usd': 'toncoin',
    'xau_to_usd': 'pax-gold'
};

const COINBASE_PRODUCTS: Record<string, string> = {
    'btc_to_usd': 'BTC-USD',
    'eth_to_usd': 'ETH-USD',
    'sol_to_usd': 'SOL-USD',
    'usdt_to_usd': 'USDT-USD',
    'xau_to_usd': 'PAXG-USD'
};

async function main() {
    console.log('🌱 Starting MULTI-YEAR REAL historical rates seeding...');
    
    const currencies = await prisma.currency.findMany();
    
    const fiatYears = [
        1999, 2000, 2001, 2002, 2003, 2004, 2005,
        2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014,
        2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026
    ];
    const cryptoYears = [2020, 2021, 2022, 2023, 2024, 2025, 2026];

    for (const c of currencies) {
        console.log(`\n----------------------------------------`);
        console.log(`Processing currency: ${c.key.toUpperCase()} (${c.name}) [Source: ${c.source}]`);
        
        const base = c.baseCurrency.toUpperCase();
        const target = c.targetCurrency.toUpperCase();
        
        let fetchedRates: { price: number, createdAt: Date }[] = [];
        
        const valId = (c.params as any)?.valId || CBR_VAL_IDS[c.key];
        if (c.source === 'cbr' && valId) {
            const needUsdRate = c.key !== 'usd_to_rub';
            
            try {
                const fetchCbrRatesForYear = async (vId: string, year: number) => {
                    const startCbrStr = `01/01/${year}`;
                    const endCbrStr = `31/12/${year}`;
                    const url = `http://www.cbr.ru/scripts/XML_dynamic.asp?date_req1=${startCbrStr}&date_req2=${endCbrStr}&VAL_NM_RQ=${vId}`;
                    
                    const res = await fetch(url);
                    const ratesMap = new Map<string, number>();
                    if (res.ok) {
                        const xml = await res.text();
                        const recordRegex = /<Record Date="([^"]+)"[^>]*>.*?<Nominal>([^<]+)<\/Nominal>.*?<Value>([^<]+)<\/Value>/g;
                        let match;
                        while ((match = recordRegex.exec(xml)) !== null) {
                            const dateStr = match[1]; // dd.mm.yyyy
                            const nominal = parseInt(match[2]);
                            const val = parseFloat(match[3].replace(',', '.'));
                            if (!isNaN(nominal) && !isNaN(val)) {
                                ratesMap.set(dateStr, val / nominal);
                            }
                        }
                    }
                    return ratesMap;
                };

                for (const year of fiatYears) {
                    console.log(`  Fetching CBR rates for year ${year}...`);
                    const targetRates = await fetchCbrRatesForYear(valId, year);
                    
                    if (needUsdRate) {
                        const usdRates = await fetchCbrRatesForYear(CBR_VAL_IDS['usd_to_rub'], year);
                        
                        targetRates.forEach((targetVal, dateStr) => {
                            const usdVal = usdRates.get(dateStr);
                            if (usdVal && targetVal > 0) {
                                const dateParts = dateStr.split('.');
                                const date = new Date(Number(dateParts[2]), Number(dateParts[1]) - 1, Number(dateParts[0]), 12, 0, 0);
                                fetchedRates.push({
                                    price: usdVal / targetVal,
                                    createdAt: date
                                });
                            }
                        });
                    } else {
                        targetRates.forEach((targetVal, dateStr) => {
                            const dateParts = dateStr.split('.');
                            const date = new Date(Number(dateParts[2]), Number(dateParts[1]) - 1, Number(dateParts[0]), 12, 0, 0);
                            fetchedRates.push({
                                price: targetVal,
                                createdAt: date
                            });
                        });
                    }
                    await delay(150);
                }
                
                console.log(`Successfully parsed ${fetchedRates.length} total daily points from CBR XML.`);
            } catch (err) {
                console.error(`❌ Failed to fetch/parse CBR history:`, err);
            }
        }
        
        else if (c.source === 'minfin' && target === 'UAH') {
            try {
                for (const year of fiatYears) {
                    console.log(`  Fetching NBU rates for year ${year}...`);
                    const startNbuStr = `${year}0101`;
                    const endNbuStr = `${year}1231`;
                    const url = `https://bank.gov.ua/NBU_Exchange/exchange_site?start=${startNbuStr}&end=${endNbuStr}&valcode=${base}&sort=exchangedate&order=asc&json`;
                    
                    const res = await fetch(url);
                    if (res.ok) {
                        const data = await res.json() as any[];
                        data.forEach(item => {
                            const dateParts = item.exchangedate.split('.'); // dd.mm.yyyy
                            const date = new Date(Number(dateParts[2]), Number(dateParts[1]) - 1, Number(dateParts[0]), 12, 0, 0);
                            const units = item.units ? Number(item.units) : 1;
                            const ratePerUnit = item.rate_per_unit !== undefined ? Number(item.rate_per_unit) : Number(item.rate) / units;
                            fetchedRates.push({
                                price: ratePerUnit,
                                createdAt: date
                            });
                        });
                    }
                    await delay(150);
                }
                console.log(`Successfully parsed ${fetchedRates.length} total daily points from NBU.`);
            } catch (err) {
                console.error(`❌ Failed to fetch/parse NBU history:`, err);
            }
        }
        
        else if (c.source === 'coinbase') {
            const product = (c.params as any)?.product || COINBASE_PRODUCTS[c.key];
            const slug = (c.params as any)?.slug || COINBASE_SLUGS[c.key];
            
            if (slug && (!product || c.key === 'ton_to_usd')) {
                try {
                    console.log(`  Fetching ${slug} history via Coinbase GraphQL (all timeframe)...`);
                    const gqlUrl = `https://www.coinbase.com/graphql/query?operationName=useGetPriceChartDataQuery&extensions=%7B%22persistedQuery%22%3A%7B%22version%22%3A1%2C%22sha256Hash%22%3A%222f667e92bca631b26ec8179b1e484b24553daaaf690b94ef251fa4aed988ea34%22%7D%7D&variables=%7B%22skip%22%3Afalse%2C%22slug%22%3A%22${slug}%22%2C%22currency%22%3A%22USD%22%7D`;
                    const res = await fetch(gqlUrl, {
                        headers: {
                            'accept': 'application/json',
                            'accept-language': 'en',
                            'content-type': 'application/json',
                            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                        }
                    });
                    
                    if (res.ok) {
                        const data = await res.json() as any;
                        const quotes = data?.data?.assetBySlug?.all?.quotes || [];
                        quotes.forEach((q: any) => {
                            fetchedRates.push({
                                price: parseFloat(q.price),
                                createdAt: new Date(q.timestamp)
                            });
                        });
                        console.log(`Successfully fetched ${fetchedRates.length} historical quotes for ${slug}.`);
                    }
                } catch (err) {
                    console.error(`❌ Failed to fetch ${slug} history:`, err);
                }
            }
            
            else if (product) {
                try {
                    for (const year of cryptoYears) {
                        console.log(`  Fetching ${product} candles for year ${year}...`);
                        const dateRanges = [
                            { start: `${year}-01-01T00:00:00Z`, end: `${year}-06-30T23:59:59Z` },
                            { start: `${year}-07-01T00:00:00Z`, end: `${year}-12-31T23:59:59Z` }
                        ];
                        
                        for (const r of dateRanges) {
                            const url = `https://api.exchange.coinbase.com/products/${product}/candles?granularity=86400&start=${r.start}&end=${r.end}`;
                            const res = await fetch(url, {
                                headers: {
                                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                                }
                            });
                            
                            if (res.ok) {
                                const data = await res.json() as any[];
                                data.forEach(item => {
                                    fetchedRates.push({
                                        price: Number(item[4]), // close price
                                        createdAt: new Date(item[0] * 1000)
                                    });
                                });
                            }
                            await delay(200);
                        }
                    }
                    console.log(`Successfully fetched ${fetchedRates.length} total daily points for ${product}.`);
                } catch (err) {
                    console.error(`❌ Failed to fetch ${product} history:`, err);
                }
            }
        }
        
        if (fetchedRates.length > 0) {
            console.log(`Saving ${fetchedRates.length} points to database...`);
            let savedCount = 0;
            
            fetchedRates.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
            
            for (let i = 0; i < fetchedRates.length; i += 100) {
                const batch = fetchedRates.slice(i, i + 100);
                
                const promises = batch.map(async (rate) => {
                    const startOfDay = new Date(rate.createdAt);
                    startOfDay.setUTCHours(0, 0, 0, 0);
                    const endOfDay = new Date(rate.createdAt);
                    endOfDay.setUTCHours(23, 59, 59, 999);
                    
                    const existing = await prisma.rate.findFirst({
                        where: {
                            currencyKey: c.key,
                            createdAt: {
                                gte: startOfDay,
                                lte: endOfDay
                            }
                        }
                    });
                    
                    if (!existing) {
                        await prisma.rate.create({
                            data: {
                                currencyKey: c.key,
                                price: rate.price,
                                createdAt: rate.createdAt,
                                direction: 'neutral'
                            }
                        });
                        savedCount++;
                    } else if (Math.abs(Number(existing.price) - rate.price) > 0.000001) {
                        await prisma.rate.update({
                            where: { id: existing.id },
                            data: { price: rate.price }
                        });
                        savedCount++;
                    }
                });
                
                await Promise.all(promises);
            }
            
            console.log(`Saved ${savedCount} new rates in database.`);
        }
        
        await delay(500);
    }
    
    console.log('\n========================================');
    console.log('✅ MULTI-YEAR REAL historical rates seeding completed successfully!');
    console.log('========================================');
}

main()
    .catch((e) => {
        console.error('❌ Error during seeding:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
