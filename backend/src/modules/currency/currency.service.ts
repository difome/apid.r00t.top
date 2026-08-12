import { CreateCurrencyDto } from "./dto/create-currency.dto";
import { prisma } from "@/lib/prisma";

export class CurrencyService {
    async getAllCurrencies() {
        const now = new Date();
        const currencies = await prisma.currency.findMany({
            where: { enabled: true },
            orderBy: { order: 'asc' },
            include: {
                rates: {
                    where: {
                        createdAt: { lte: now }
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            }
        });

        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        return Promise.all(currencies.map(async (c) => {
            const rate24h = await prisma.rate.findFirst({
                where: { 
                    currencyKey: c.key,
                    createdAt: { lte: yesterday } 
                },
                orderBy: { createdAt: 'desc' }
            });

            const currentRate = c.rates[0];
            const currentPrice = currentRate ? Number(currentRate.price) : 0;
            const oldPrice = rate24h ? Number(rate24h.price) : currentPrice;

            const diff = currentPrice - oldPrice;
            const percent = oldPrice !== 0 ? (diff / oldPrice) * 100 : 0;

            return {
                ...c,
                latestRate: currentRate,
                stats24h: {
                    oldPrice,
                    diff: Number(diff.toFixed(8)),
                    percent: Number(percent.toFixed(2)),
                    direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable'
                }
            };
        }));
    }

    async getHistory(key: string, days: number = 30, year?: number) {
        let dateStart = new Date();
        let dateEnd = new Date();

        if (year) {
            dateStart = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
            dateEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
            
            const currentYear = new Date().getFullYear();
            if (year === currentYear && dateEnd > new Date()) {
                dateEnd = new Date();
            }
        } else if (days >= 7300) {
            const earliestRecord = await prisma.rate.findFirst({
                where: { currencyKey: key },
                orderBy: { createdAt: 'asc' },
                select: { createdAt: true }
            });
            if (earliestRecord) {
                dateStart = new Date(earliestRecord.createdAt);
            } else {
                dateStart.setDate(dateStart.getDate() - 365);
            }
        } else {
            dateStart.setDate(dateStart.getDate() - days);
        }

        const rates = await prisma.rate.findMany({
            where: {
                currencyKey: key,
                createdAt: {
                    gte: dateStart,
                    lte: dateEnd
                }
            },
            orderBy: { createdAt: 'asc' },
            select: {
                price: true,
                createdAt: true
            }
        });

        let lastKnownPrice = 0;
        const initialRate = await prisma.rate.findFirst({
            where: {
                currencyKey: key,
                createdAt: { lt: dateStart }
            },
            orderBy: { createdAt: 'desc' },
            select: { price: true }
        });
        if (initialRate) {
            lastKnownPrice = Number(initialRate.price);
        } else if (rates.length > 0) {
            lastKnownPrice = Number(rates[0].price);
        }

        if (days === 1 && !year) {
            if (rates.length < 2) {
                const initialPrice = lastKnownPrice || 0;
                return [
                    { createdAt: dateStart, price: initialPrice },
                    { createdAt: new Date(), price: rates[0] ? Number(rates[0].price) : initialPrice }
                ];
            }
            return rates.map(r => ({
                createdAt: r.createdAt,
                price: Number(r.price)
            }));
        }

        const dailyMap = new Map<string, number>();
        rates.forEach(r => {
            const dateStr = r.createdAt.toISOString().split('T')[0];
            dailyMap.set(dateStr, Number(r.price));
        });

        const result: { createdAt: Date, price: number }[] = [];

        const diffTime = Math.abs(dateEnd.getTime() - dateStart.getTime());
        const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const maxPoints = 200;
        const step = totalDays > maxPoints ? Math.ceil(totalDays / maxPoints) : 1;

        for (let i = totalDays - 1; i >= 0; i -= step) {
            const date = new Date(dateEnd);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
            let currentPrice = lastKnownPrice;
            for (let j = 0; j < step; j++) {
                const checkDate = new Date(date);
                checkDate.setDate(checkDate.getDate() - j);
                const checkStr = checkDate.toISOString().split('T')[0];
                if (dailyMap.has(checkStr)) {
                    currentPrice = dailyMap.get(checkStr)!;
                    lastKnownPrice = currentPrice;
                    break;
                }
            }
            
            result.push({
                createdAt: new Date(dateStr),
                price: currentPrice
            });
        }

        const lastDateStr = dateEnd.toISOString().split('T')[0];
        const lastPrice = dailyMap.has(lastDateStr) ? dailyMap.get(lastDateStr)! : lastKnownPrice;
        if (result.length > 0 && result[result.length - 1].createdAt.toISOString().split('T')[0] !== lastDateStr) {
            result.push({
                createdAt: new Date(lastDateStr),
                price: lastPrice
            });
        }

        return result;
    }



    async getLegacyRates(forceRefresh: boolean = false) {
        const currencies = await this.getAllCurrencies();
        
        const ratesData: Record<string, any> = {};
        const symbolsMap: Record<string, any> = {};
        let latestDate: Date | null = null;

        for (const c of currencies) {
            const currentPrice = c.latestRate ? Number(c.latestRate.price) : 0;
            
            ratesData[c.key] = {
                rate: currentPrice,
                change: {
                    absolute: c.stats24h.diff,
                    percent: c.stats24h.percent,
                    direction: c.stats24h.direction
                }
            };

            const symbolKey = c.baseCurrency.toUpperCase();
            if (!symbolsMap[symbolKey]) {
                symbolsMap[symbolKey] = {
                    symbol: c.symbol,
                    emoji: c.emoji,
                    name: c.name.split('/')[0] || c.name,
                    code: symbolKey
                };
            }

            if (c.latestRate && (!latestDate || c.latestRate.createdAt > latestDate)) {
                latestDate = c.latestRate.createdAt;
            }
        }

        const formattedDate = latestDate 
            ? new Intl.DateTimeFormat('ru-RU', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
              }).format(latestDate).replace(',', '')
            : 'N/A';

        return {
            success: true,
            data: ratesData,
            currency_symbols: symbolsMap,
            actual_date: formattedDate,
            cache_used: !forceRefresh,
            has_24h_comparison: true
        };
    }



    async convert(amount: number, from: string, targets: string[], excludeSource: boolean = false) {
        const results: Record<string, any> = {};
        const fromUpper = from.toUpperCase();
        
        const LEGACY_NAME_MAP: Record<string, string> = { "TON": "GRAM" };
        const normalizedFrom = LEGACY_NAME_MAP[fromUpper] || fromUpper;
        
        const currencies = await this.getAllCurrencies();
        
        let latestDate: Date | null = null;

        for (const target of targets) {
            const targetUpper = LEGACY_NAME_MAP[target.toUpperCase()] || target.toUpperCase();
            
            if (excludeSource && fromUpper === targetUpper) {
                continue;
            }

            
            const targetCurrency = currencies.find(c => 
                c.baseCurrency === targetUpper || c.targetCurrency === targetUpper
            );

            const fromCurrency = currencies.find(c => 
                c.baseCurrency === normalizedFrom || c.targetCurrency === normalizedFrom
            );

            if (targetCurrency) {
                
                const directPair = currencies.find(c => 
                    c.baseCurrency === normalizedFrom && c.targetCurrency === targetUpper
                );

                const reversePair = currencies.find(c => 
                    c.baseCurrency === targetUpper && c.targetCurrency === fromUpper
                );

            let rate = 0;
            let stats = { diff: 0, percent: 0, direction: 'stable' };

            if (directPair && directPair.latestRate) {
                rate = Number(directPair.latestRate.price);
                stats = directPair.stats24h;
            } else if (reversePair && reversePair.latestRate) {
                rate = 1 / Number(reversePair.latestRate.price);
                stats = {
                    diff: -reversePair.stats24h.diff,
                    percent: -reversePair.stats24h.percent,
                    direction: reversePair.stats24h.direction === 'up' ? 'down' : reversePair.stats24h.direction === 'down' ? 'up' : 'stable'
                };
            } else {
                const fromToUsd = currencies.find(c => c.baseCurrency === normalizedFrom && c.targetCurrency === 'USD');
                const usdToFrom = currencies.find(c => c.baseCurrency === 'USD' && c.targetCurrency === normalizedFrom);
                
                const targetToUsd = currencies.find(c => c.baseCurrency === targetUpper && c.targetCurrency === 'USD');
                const usdToTarget = currencies.find(c => c.baseCurrency === 'USD' && c.targetCurrency === targetUpper);

                let fromUsdRate = 0;
                if (fromToUsd && fromToUsd.latestRate) fromUsdRate = Number(fromToUsd.latestRate.price);
                else if (usdToFrom && usdToFrom.latestRate) fromUsdRate = 1 / Number(usdToFrom.latestRate.price);
                else if (normalizedFrom === 'USD') fromUsdRate = 1;

                let targetUsdRate = 0;
                if (targetToUsd && targetToUsd.latestRate) targetUsdRate = Number(targetToUsd.latestRate.price);
                else if (usdToTarget && usdToTarget.latestRate) targetUsdRate = 1 / Number(usdToTarget.latestRate.price);
                else if (targetUpper === 'USD') targetUsdRate = 1;

                if (fromUsdRate > 0 && targetUsdRate > 0) {
                    rate = fromUsdRate / targetUsdRate;
                    
                    let fromPct = 0, targetPct = 0;
                    if (fromToUsd) fromPct = fromToUsd.stats24h.percent / 100;
                    else if (usdToFrom) fromPct = -usdToFrom.stats24h.percent / 100;
                    
                    if (targetToUsd) targetPct = targetToUsd.stats24h.percent / 100;
                    else if (usdToTarget) targetPct = -usdToTarget.stats24h.percent / 100;
                    
                    const crossPct = ((1 + fromPct) / (1 + targetPct)) - 1;
                    const crossPctDisp = Number((crossPct * 100).toFixed(2));
                    
                    stats = {
                        diff: 0,
                        percent: crossPctDisp,
                        direction: crossPctDisp > 0 ? 'up' : crossPctDisp < 0 ? 'down' : 'stable'
                    };
                }
            }

                if (rate > 0) {
                    results[target.toLowerCase()] = {
                        currency: target.toLowerCase(),
                        value: Number((amount * rate).toFixed(8)),
                        amount: Number((amount * rate).toFixed(8)),
                        rate: Number(rate.toFixed(8)),
                        rate_change: {
                            absolute: stats.diff,
                            percent: stats.percent,
                            direction: stats.direction
                        },
                        change: {
                            absolute: stats.diff,
                            percent: stats.percent,
                            direction: stats.direction
                        },
                        symbol: targetCurrency.symbol,
                        emoji: targetCurrency.emoji
                    };

                    if (targetCurrency.latestRate && (!latestDate || targetCurrency.latestRate.createdAt > latestDate)) {
                        latestDate = targetCurrency.latestRate.createdAt;
                    }
                } else {
                    results[target.toLowerCase()] = { error: 'Rate not found' };
                }
            }
        }

        const actualDate = latestDate 
            ? new Intl.DateTimeFormat('ru-RU', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
              }).format(latestDate).replace(',', '')
            : new Date().toLocaleString();

        return {
            results,
            actualDate
        };
    }
    async addCurrency(data: CreateCurrencyDto) {
        const existing = await prisma.currency.findUnique({ where: { key: data.key } });
        if (existing) throw new Error('Currency key already exists');

        const existingPair = await prisma.currency.findFirst({
            where: { baseCurrency: data.baseCurrency, targetCurrency: data.targetCurrency },
        });
        if (existingPair) throw new Error('Pair already exists');

        return prisma.currency.create({
            data: {
                key: data.key,
                name: data.name,
                type: data.type,
                source: data.source,
                baseCurrency: data.baseCurrency,
                targetCurrency: data.targetCurrency,
                symbol: data.symbol,
                emoji: data.emoji,
                order: data.order,
                enabled: data.enabled,
                params: data.params as any,
            },
        });
    }

    async getAvailableYears(key: string): Promise<number[]> {
        const result = await prisma.$queryRaw<any[]>`
            SELECT DISTINCT YEAR(createdAt) as year 
            FROM Rate 
            WHERE currencyKey = ${key} 
            ORDER BY year ASC
        `;
        
        const years = result
            .map(r => r.year ? Number(r.year) : null)
            .filter((y): y is number => y !== null);
            
        if (years.length === 0) {
            return [new Date().getFullYear()];
        }
        
        return years;
    }

    async getSupportedCurrencies() {
        const currencies = await prisma.currency.findMany({
            where: { enabled: true },
            orderBy: { order: 'asc' }
        });

        const currenciesData: Record<string, any> = {};
        const supportedList = new Set<string>();

        for (const c of currencies) {
            const targetCode = c.targetCurrency.toLowerCase();
            supportedList.add(targetCode);
            
            if (!currenciesData[targetCode]) {
                const targetName = c.name.split('/')[1] || c.name;
                currenciesData[targetCode] = {
                    name: targetCode.toUpperCase(),
                    symbol: c.symbol || '',
                    emoji: c.emoji || '',
                    description: targetName
                };
            }
        }

        for (const c of currencies) {
            const baseCode = c.baseCurrency.toLowerCase();
            supportedList.add(baseCode);

            if (!currenciesData[baseCode]) {
                const isCrypto = c.type === 'crypto';
                currenciesData[baseCode] = {
                    name: baseCode.toUpperCase(),
                    symbol: baseCode === 'usd' ? '$' : baseCode === 'eur' ? '€' : (isCrypto ? '🪙' : '$'),
                    emoji: baseCode === 'usd' ? '💵' : baseCode === 'eur' ? '🇪🇺' : '🪙',
                    description: baseCode.toUpperCase()
                };
            }
        }

        return {
            supported_currencies: Array.from(supportedList),
            currencies: currenciesData
        };
    }
}
