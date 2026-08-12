import { prisma } from "@/lib/prisma";
import { seedCurrencyHistory } from "@/modules/currency/history-seeder";

export class AdminService {
    async getParsingLogs(limit: number = 50) {
        return prisma.parsingLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: limit
        });
    }

    async createParsingLog(data: {
        status: string;
        source?: string;
        message: string;
        duration?: number;
    }) {
        return prisma.parsingLog.create({
            data: {
                ...data,
                createdAt: new Date()
            }
        });
    }

    async getTrafficLogs(limit: number = 50) {
        return prisma.apiRequestLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: limit
        });
    }

    async getConfig(key: string) {
        return prisma.systemConfig.findUnique({
            where: { key }
        });
    }

    async setConfig(key: string, value: string) {
        return prisma.systemConfig.upsert({
            where: { key },
            update: { value },
            create: { key, value }
        });
    }

    async getAllCurrencies() {
        const list = await prisma.currency.findMany({
            orderBy: { key: 'asc' },
            include: {
                _count: {
                    select: { rates: true }
                }
            }
        });
        return list.map(c => ({
            ...c,
            ratesCount: c._count.rates
        }));
    }

    async createCurrency(data: any) {
        const created = await prisma.currency.create({
            data: {
                key: data.key,
                name: data.name,
                type: data.type,
                source: data.source,
                baseCurrency: data.baseCurrency.toUpperCase(),
                targetCurrency: data.targetCurrency.toUpperCase(),
                symbol: data.symbol || null,
                emoji: data.emoji || null,
                params: data.params || null,
                enabled: data.enabled ?? true,
                order: data.order ?? 0
            }
        });

        seedCurrencyHistory(created.key).catch(err => {
            console.error(`[Admin Service] Background seeding failed for ${created.key}:`, err);
        });

        return created;
    }

    async updateCurrency(key: string, data: any) {
        return prisma.currency.update({
            where: { key },
            data
        });
    }

    async banIp(ip: string, reason?: string) {
        return prisma.bannedIp.upsert({
            where: { ip },
            update: { reason },
            create: { ip, reason }
        });
    }

    async unbanIp(ip: string) {
        return prisma.bannedIp.delete({
            where: { ip }
        });
    }

    async deleteCurrency(key: string) {
        await prisma.rate.deleteMany({
            where: { currencyKey: key }
        });
        return prisma.currency.delete({
            where: { key }
        });
    }
}
