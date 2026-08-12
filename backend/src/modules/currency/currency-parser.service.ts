import { prisma } from "@/lib/prisma";
import { ICurrencyProvider } from "./providers/base.provider";
import { CoinbaseProvider } from "./providers/coinbase.provider";
import { CBRProvider } from "./providers/cbr.provider";
import { MinfinProvider } from "./providers/minfin.provider";

export class CurrencyParserService {
    private providers: ICurrencyProvider[] = [
        new CoinbaseProvider(),
        new CBRProvider(),
        new MinfinProvider(),
    ];



    async run() {
        const startTime = performance.now();
        let successCount = 0;
        let errorCount = 0;
        let skipCount = 0;
        const errors: string[] = [];

        console.log('🔄 Starting currency rates update...');
        
        try {
            this.providers.forEach(p => p.clearCache?.());

            const currencies = await prisma.currency.findMany({
                where: { enabled: true }
            });

            const details: string[] = [];

            for (const currency of currencies) {
                try {
                    const provider = this.providers.find(p => p.name === currency.source);
                    if (!provider) {
                        const msg = `Provider not found for source: ${currency.source}`;
                        console.warn(`⚠️ ${msg}`);
                        details.push(`❌ ${currency.key}: ${msg}`);
                        errorCount++;
                        continue;
                    }

                    const newPrice = await provider.fetchRate(currency.baseCurrency, currency.targetCurrency, currency.params);

                    const lastRate = await prisma.rate.findFirst({
                        where: { currencyKey: currency.key },
                        orderBy: { createdAt: 'desc' }
                    });

                    let diff = 0;
                    let diffPercent = 0;
                    let direction = 'neutral';

                    if (lastRate) {
                        const oldPrice = Number(lastRate.price);
                        
                        const isNewDay = new Date(lastRate.createdAt).toDateString() !== new Date().toDateString();

                        if (newPrice === oldPrice && !isNewDay) {
                            details.push(`ℹ️ ${currency.key}: ${newPrice} (unchanged)`);
                            skipCount++;
                            continue;
                        }

                        diff = newPrice - oldPrice;
                        diffPercent = (diff / oldPrice) * 100;
                        direction = diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable';
                    }

                    await prisma.rate.create({
                        data: {
                            currencyKey: currency.key,
                            price: newPrice,
                            diff: diff,
                            diffPercent: diffPercent,
                            direction: direction
                        }
                    });

                    successCount++;
                    details.push(`✅ ${currency.key}: ${newPrice} (${direction})`);
                    console.log(`✅ Updated ${currency.key}: ${newPrice} (${direction})`);
                } catch (err) {
                    const msg = (err as Error).message;
                    console.error(`❌ Failed to update ${currency.key}:`, msg);
                    details.push(`❌ ${currency.key}: Error - ${msg}`);
                    errorCount++;
                }
            }

            const duration = Math.round(performance.now() - startTime);
            const status = errorCount > 0 ? (successCount > 0 ? 'warning' : 'error') : 'success';
            const summary = `Total: ${currencies.length} (Updated: ${successCount}, Skipped: ${skipCount}, Failed: ${errorCount})`;
            const message = `${summary}; ${details.join('; ')}`.slice(0, 5000);

            await prisma.parsingLog.create({
                data: {
                    status,
                    source: 'System Parser',
                    message,
                    duration,
                    createdAt: new Date()
                }
            });

            console.log('✨ All rates updated.');
        } catch (globalErr) {
            console.error('❌ Critical error in parser service:', globalErr);
            await prisma.parsingLog.create({
                data: {
                    status: 'error',
                    source: 'System Parser',
                    message: `CRITICAL: ${(globalErr as Error).message}`,
                    createdAt: new Date()
                }
            });
        }
    }
}
