import { prisma } from "@/lib/prisma";

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

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function seedCurrencyHistory(key: string): Promise<void> {
    console.log(`🌱 [History Seeder] Starting background historical rates sync for ${key}...`);

    try {
        const c = await prisma.currency.findUnique({
            where: { key }
        });

        if (!c) {
            console.error(`❌ [History Seeder] Currency with key ${key} not found in database.`);
            return;
        }

        const base = c.baseCurrency.toUpperCase();
        const target = c.targetCurrency.toUpperCase();
        
        const fiatYears = [
            1999, 2000, 2001, 2002, 2003, 2004, 2005,
            2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014,
            2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026
        ];
        const cryptoYears = [2020, 2021, 2022, 2023, 2024, 2025, 2026];
        
        let fetchedRates: { price: number, createdAt: Date }[] = [];

        let valId = (c.params as any)?.valId || CBR_VAL_IDS[c.key];
        
        if (c.source === 'cbr' && !valId) {
            console.log(`  [History Seeder] CBR valId not found in params for ${target}. Auto-resolving from CBR API...`);
            try {
                const res = await fetch('http://www.cbr.ru/scripts/XML_daily.asp');
                if (res.ok) {
                    const xml = await res.text();
                    const targetCode = target; // e.g. PLN
                    const valuteRegex = new RegExp(`<Valute ID="([^"]+)">\\s*<NumCode>\\d+</NumCode>\\s*<CharCode>${targetCode}</CharCode>`, 's');
                    const match = valuteRegex.exec(xml);
                    if (match && match[1]) {
                        valId = match[1];
                        console.log(`  [History Seeder] Automatically resolved valId=${valId} for ${targetCode}`);
                        // Update the DB so we don't have to resolve it again
                        const newParams = { ...(c.params as any || {}), valId };
                        await prisma.currency.update({
                            where: { key },
                            data: { params: newParams }
                        });
                    } else {
                        console.log(`  [History Seeder] Could not find CharCode=${targetCode} in CBR daily XML.`);
                    }
                }
            } catch (err) {
                console.error(`❌ [History Seeder] Failed to auto-resolve CBR valId:`, err);
            }
        }

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
                    console.log(`  [History Seeder] Fetching CBR rates for year ${year}...`);
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
                    await delay(100);
                }
            } catch (err) {
                console.error(`❌ [History Seeder] Failed to fetch CBR history:`, err);
            }
        }
        
        else if (c.source === 'minfin' && target === 'UAH') {
            try {
                for (const year of fiatYears) {
                    console.log(`  [History Seeder] Fetching NBU rates for year ${year}...`);
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
                    await delay(100);
                }
            } catch (err) {
                console.error(`❌ [History Seeder] Failed to fetch NBU history:`, err);
            }
        }
        
        else if (c.source === 'coinbase') {
            const product = (c.params as any)?.product || COINBASE_PRODUCTS[c.key];
            const slug = (c.params as any)?.slug || COINBASE_SLUGS[c.key];
            
            if (slug && (!product || c.key === 'ton_to_usd')) {
                try {
                    console.log(`  [History Seeder] Fetching ${slug} history via Coinbase GraphQL...`);
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
                        console.log(`  [History Seeder] Successfully fetched ${fetchedRates.length} historical quotes for ${slug}.`);
                    }
                } catch (err) {
                    console.error(`❌ [History Seeder] Failed to fetch ${slug} history:`, err);
                }
            }
            else if (product) {
                try {
                    for (const year of cryptoYears) {
                        console.log(`  [History Seeder] Fetching ${product} candles for year ${year}...`);
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
                } catch (err) {
                    console.error(`❌ [History Seeder] Failed to fetch ${product} history:`, err);
                }
            }
        }

        if (fetchedRates.length > 0) {
            console.log(`[History Seeder] Saving ${fetchedRates.length} points to database for ${key}...`);
            let savedCount = 0;
            
            fetchedRates.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
            
            for (let i = 0; i < fetchedRates.length; i += 50) {
                const batch = fetchedRates.slice(i, i + 50);
                
                const promises = batch.map(async (rate) => {
                    const startOfDay = new Date(rate.createdAt);
                    startOfDay.setUTCHours(0, 0, 0, 0);
                    const endOfDay = new Date(rate.createdAt);
                    endOfDay.setUTCHours(23, 59, 59, 999);
                    
                    const existing = await prisma.rate.findFirst({
                        where: {
                            currencyKey: key,
                            createdAt: {
                                gte: startOfDay,
                                lte: endOfDay
                            }
                        }
                    });
                    
                    if (!existing) {
                        await prisma.rate.create({
                            data: {
                                currencyKey: key,
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
                await delay(50);
            }
            
            console.log(`✨ [History Seeder] Completed seeding for ${key}! Saved/updated ${savedCount} rates.`);
        } else {
            console.log(`⚠️ [History Seeder] No historical rates fetched for ${key}.`);
        }

    } catch (err) {
        console.error(`❌ [History Seeder] Critical error during background seeding:`, err);
    }
}
