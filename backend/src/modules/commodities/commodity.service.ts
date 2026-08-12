import { prisma } from "@/lib/prisma"
import { CommodityInvestingProvider } from "./providers/investing.provider"
import type { CreateCommodityInput, UpdateCommodityInput } from "./commodity.schema"

import { appendFileSync } from "fs";
import { join } from "path";
const COMMODITY_LOG = join(__dirname, "..", "..", "..", "commodity_sync.log");
function logSync(msg: string) {
  const ts = new Date().toISOString().replace("T", " ").substring(0, 19);
  try { appendFileSync(COMMODITY_LOG, "[" + ts + "] " + msg + "\n"); } catch {}
}
export class CommodityService {
    private provider = new CommodityInvestingProvider()

    /**
     * Get all enabled commodities with their latest rate
     */
    async getAllCommodities(category?: string) {
        const now = new Date()
        const whereClause: any = { enabled: true }
        if (category) {
            whereClause.category = category
        }
        const commodities = await prisma.commodity.findMany({
            where: whereClause,
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
        })

        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

        return Promise.all(commodities.map(async (c) => {
            const rate24h = await prisma.commodityRate.findFirst({
                where: {
                    commodityId: c.id,
                    createdAt: { lte: yesterday }
                },
                orderBy: { createdAt: 'desc' }
            })

            const currentRate = c.rates[0]
            const currentPrice = currentRate ? Number(currentRate.price) : 0
            const oldPrice = rate24h ? Number(rate24h.price) : currentPrice

            const diff = currentPrice - oldPrice
            const percent = oldPrice !== 0 ? (diff / oldPrice) * 100 : 0

            return {
                ...c,
                latestRate: currentRate,
                stats24h: {
                    oldPrice,
                    diff: Number(diff.toFixed(4)),
                    percent: Number(percent.toFixed(2)),
                    direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable'
                }
            }
        }))
    }

    /**
     * Get all commodities (admin view)
     */
    async getAllCommoditiesAdmin() {
        const list = await prisma.commodity.findMany({
            orderBy: { order: 'asc' },
            include: {
                _count: {
                    select: { rates: true }
                }
            }
        })
        return list.map(c => ({
            ...c,
            ratesCount: c._count.rates
        }))
    }

    /**
     * Get legacy-style rates (like currency service)
     */
    async getLegacyRates(forceRefresh: boolean = false) {
        const commodities = await this.getAllCommodities()

        const ratesData: Record<string, any> = {}
        let latestDate: Date | null = null

        for (const c of commodities) {
            const currentPrice = c.latestRate ? Number(c.latestRate.price) : 0

            ratesData[c.symbol] = {
                rate: currentPrice,
                change: {
                    absolute: c.stats24h.diff,
                    percent: c.stats24h.percent,
                    direction: c.stats24h.direction
                },
                unit: c.unit,
                category: c.category,
                name: c.name,
                nameRu: c.nameRu,
                nameUa: c.nameUa,
            }

            if (c.latestRate && (!latestDate || c.latestRate.createdAt > latestDate)) {
                latestDate = c.latestRate.createdAt
            }
        }

        const formattedDate = latestDate
            ? new Intl.DateTimeFormat('ru-RU', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
              }).format(latestDate).replace(',', '')
            : 'N/A'

        return {
            success: true,
            data: ratesData,
            actual_date: formattedDate,
            cache_used: !forceRefresh,
            has_24h_comparison: true
        }
    }

    /**
     * Get supported commodities list
     */
    async getSupportedCommodities() {
        const commodities = await prisma.commodity.findMany({
            where: { enabled: true },
            orderBy: { order: 'asc' }
        })

        const commoditiesData: Record<string, any> = {}
        const supportedList: string[] = []

        for (const c of commodities) {
            supportedList.push(c.symbol)
            commoditiesData[c.symbol] = {
                name: c.name,
                nameRu: c.nameRu,
                nameUa: c.nameUa,
                category: c.category,
                unit: c.unit,
                exchange: c.exchange,
            }
        }

        return {
            supported_commodities: supportedList,
            commodities: commoditiesData
        }
    }

    /**
     * Get history for a commodity by symbol
     */
    async getHistory(symbol: string, days: number = 30, year?: number) {
        const commodity = await prisma.commodity.findUnique({
            where: { symbol }
        })
        if (!commodity) {
            throw new Error('Commodity not found: ' + symbol)
        }

        let dateStart = new Date()
        let dateEnd = new Date()

        if (year) {
            dateStart = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0))
            dateEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999))
            
            const currentYear = new Date().getFullYear()
            if (year === currentYear && dateEnd > new Date()) {
                dateEnd = new Date()
            }
        } else if (days >= 7300) {
            const earliestRecord = await prisma.commodityRate.findFirst({
                where: { commodityId: commodity.id },
                orderBy: { createdAt: 'asc' },
                select: { createdAt: true }
            })
            if (earliestRecord) {
                dateStart = new Date(earliestRecord.createdAt)
            } else {
                dateStart.setDate(dateStart.getDate() - 365)
            }
        } else {
            const latestRate = await prisma.commodityRate.findFirst({
                where: { commodityId: commodity.id },
                orderBy: { createdAt: 'desc' },
                select: { createdAt: true }
            })
            if (latestRate) {
                dateStart = new Date(latestRate.createdAt)
                dateEnd = new Date(latestRate.createdAt)
            }
            dateStart.setDate(dateStart.getDate() - days)
        }

        const rates = await prisma.commodityRate.findMany({
            where: {
                commodityId: commodity.id,
                createdAt: {
                    gte: dateStart,
                    lte: dateEnd
                }
            },
            orderBy: { createdAt: 'asc' },
            select: { price: true, createdAt: true }
        })
        // Remove early return that bypassed grouping logic

        let lastKnownPrice = 0
        const initialRate = await prisma.commodityRate.findFirst({
            where: {
                commodityId: commodity.id,
                createdAt: { lt: dateStart }
            },
            orderBy: { createdAt: 'desc' },
            select: { price: true }
        })
        if (initialRate) {
            lastKnownPrice = Number(initialRate.price)
        } else if (rates.length > 0) {
            lastKnownPrice = Number(rates[0].price)
        }

        if (days === 1 && !year) {
            if (rates.length < 2) {
                const initialPrice = lastKnownPrice || 0
                return [
                    { createdAt: dateStart, price: initialPrice },
                    { createdAt: new Date(), price: rates[0] ? Number(rates[0].price) : initialPrice }
                ]
            }
            return rates.map(r => ({
                createdAt: r.createdAt,
                price: Number(r.price)
            }))
        }

        // Group by day
        const dailyMap = new Map<string, number>()
        rates.forEach(r => {
            const dateStr = r.createdAt.toISOString().split('T')[0]
            dailyMap.set(dateStr, Number(r.price))
        })

        const result: { createdAt: Date, price: number }[] = []
        const diffTime = Math.abs(dateEnd.getTime() - dateStart.getTime())
        const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        const maxPoints = 200
        const step = totalDays > maxPoints ? Math.ceil(totalDays / maxPoints) : 1

        for (let i = totalDays - 1; i >= 0; i -= step) {
            const date = new Date(dateEnd)
            date.setDate(date.getDate() - i)
            const dateStr = date.toISOString().split('T')[0]
            
            let currentPrice = lastKnownPrice
            for (let j = 0; j < step; j++) {
                const checkDate = new Date(date)
                checkDate.setDate(checkDate.getDate() - j)
                const checkStr = checkDate.toISOString().split('T')[0]
                if (dailyMap.has(checkStr)) {
                    currentPrice = dailyMap.get(checkStr)!
                    lastKnownPrice = currentPrice
                    break
                }
            }
            
            result.push({
                createdAt: new Date(dateStr),
                price: currentPrice
            })
        }

        const lastDateStr = dateEnd.toISOString().split('T')[0]
        const lastPrice = dailyMap.has(lastDateStr) ? dailyMap.get(lastDateStr)! : lastKnownPrice
        if (result.length > 0 && result[result.length - 1].createdAt.toISOString().split('T')[0] !== lastDateStr) {
            result.push({
                createdAt: new Date(lastDateStr),
                price: lastPrice
            })
        }

        return result
    }

    /**
     * Get available years for a commodity
     */
    async getAvailableYears(symbol: string): Promise<number[]> {
        const commodity = await prisma.commodity.findUnique({
            where: { symbol }
        })
        if (!commodity) {
            return [new Date().getFullYear()]
        }

        const result = await prisma.$queryRaw<any[]>`
            SELECT DISTINCT YEAR(createdAt) as year 
            FROM CommodityRate 
            WHERE commodityId = ${commodity.id} 
            ORDER BY year ASC
        `
        
        const years = result
            .map(r => r.year ? Number(r.year) : null)
            .filter((y): y is number => y !== null)
            
        if (years.length === 0) {
            return [new Date().getFullYear()]
        }
        
        return years
    }

    /**
     * Add a new commodity
     */
    async addCommodity(data: CreateCommodityInput) {
        const existing = await prisma.commodity.findUnique({
            where: { symbol: data.symbol }
        })
        if (existing) {
            throw new Error('Commodity symbol already exists: ' + data.symbol)
        }

        return prisma.commodity.create({
            data: {
                symbol: data.symbol,
                name: data.name,
                nameRu: data.nameRu || null,
                nameUa: data.nameUa || null,
                category: data.category,
                unit: data.unit,
                exchange: data.exchange || null,
                source: data.source,
                params: data.params as any || null,
                order: data.order ?? 0,
                enabled: data.enabled ?? true,
            }
        })
    }

    /**
     * Update a commodity
     */
    async updateCommodity(symbol: string, data: UpdateCommodityInput) {
        return prisma.commodity.update({
            where: { symbol },
            data: {
                ...(data.symbol !== undefined && { symbol: data.symbol }),
                ...(data.name !== undefined && { name: data.name }),
                ...(data.nameRu !== undefined && { nameRu: data.nameRu }),
                ...(data.nameUa !== undefined && { nameUa: data.nameUa }),
                ...(data.category !== undefined && { category: data.category }),
                ...(data.unit !== undefined && { unit: data.unit }),
                ...(data.exchange !== undefined && { exchange: data.exchange }),
                ...(data.source !== undefined && { source: data.source }),
                ...(data.params !== undefined && { params: data.params as any }),
                ...(data.order !== undefined && { order: data.order }),
                ...(data.enabled !== undefined && { enabled: data.enabled }),
            }
        })
    }

    /**
     * Delete a commodity and its rates
     */
    async deleteCommodity(symbol: string) {
        const commodity = await prisma.commodity.findUnique({
            where: { symbol }
        })
        if (!commodity) {
            throw new Error('Commodity not found: ' + symbol)
        }
        await prisma.commodityRate.deleteMany({
            where: { commodityId: commodity.id }
        })
        return prisma.commodity.delete({
            where: { symbol }
        })
    }

    /**
     * Sync all enabled commodities from investing.com
     */
    async syncAllPrices(): Promise<{ success: boolean; updated: number; errors: string[] }> {
        const commodities = await prisma.commodity.findMany({
            where: { enabled: true, source: 'investing' }
        })

        const symbols = commodities.map(c => c.symbol)
        const prices = await this.provider.fetchPrices(symbols)

        const errors: string[] = []
        let updated = 0

        const detailLines: string[] = []

        for (const commodity of commodities) {
            const priceData = prices[commodity.symbol]
            if (!priceData || priceData.price <= 0) {
                detailLines.push("\u274c " + commodity.symbol + ": data not available")
                errors.push(commodity.symbol + ": no price data returned")
                continue
            }

            try {
                // Find last known price to determine direction
                const lastRate = await prisma.commodityRate.findFirst({
                    where: { commodityId: commodity.id },
                    orderBy: { createdAt: "desc" }
                })
                const oldPrice = lastRate ? Number(lastRate.price) : null
                const newPrice = priceData.price
                const dir = oldPrice !== null
                    ? (newPrice > oldPrice ? "up" : newPrice < oldPrice ? "down" : "unchanged")
                    : "unchanged"
                const emoji = dir === "up" ? "\U0001f525" : dir === "down" ? "\u2744\ufe0f" : "\u2139\ufe0f"

                detailLines.push(emoji + " " + commodity.symbol + ": " + Number(newPrice).toFixed(2) + " (" + dir + ")")

                await prisma.commodityRate.create({
                    data: {
                        commodityId: commodity.id,
                        price: newPrice,
                        change24h: priceData.change24h,
                        changePercent24h: priceData.changePercent24h,
                        high24h: priceData.high24h,
                        low24h: priceData.low24h,
                    }
                })
                updated++
            } catch (err: any) {
                detailLines.push("\u274c " + commodity.symbol + ": " + err.message)
                errors.push(commodity.symbol + ": " + err.message)
            }
        }
        const summary = "Total: " + commodities.length + " (Updated: " + updated + ", Errors: " + errors.length + ")";
        const detailMsg = summary + "\n" + detailLines.join("\n");
        logSync(detailMsg);
        try {
            await prisma.parsingLog.create({
                data: {
                    status: errors.length === 0 ? "success" : "warning",
                    source: "commodities",
                    message: detailMsg,
                }
            });
        } catch {}
        return { success: errors.length === 0, updated, errors }
    }

    /**
     * Sync a single commodity price
     */
    async syncOnePrice(symbol: string): Promise<{ success: boolean; price?: number }> {
        const commodity = await prisma.commodity.findUnique({
            where: { symbol }
        })
        if (!commodity) {
            throw new Error('Commodity not found: ' + symbol)
        }

        const priceData = await this.provider.fetchPrice(symbol)
        if (!priceData || priceData.price <= 0) {
            throw new Error('No valid price returned for ' + symbol)
        }

        await prisma.commodityRate.create({
            data: {
                commodityId: commodity.id,
                price: priceData.price,
                change24h: priceData.change24h,
                changePercent24h: priceData.changePercent24h,
                high24h: priceData.high24h,
                low24h: priceData.low24h,
            }
        })

        return { success: true, price: priceData.price }
    }

    /**
     * Health check
     */
    async healthCheck() {
        const rates = await this.getLegacyRates()
        
        let status = 'healthy'
        let message = 'Данные актуальны'

        if (rates.actual_date === 'N/A') {
            status = 'unknown'
            message = 'Не удалось определить время обновления'
        } else {
            try {
                const [datePart, timePart] = rates.actual_date.split(' ')
                const [d, m, y] = datePart.split('.').map(Number)
                const [H, M, S] = timePart.split(':').map(Number)
                const actualDate = new Date(y, m - 1, d, H, M, S)
                const ageMinutes = Math.floor((new Date().getTime() - actualDate.getTime()) / 60000)

                if (ageMinutes > 30) {
                    status = 'warning'
                    message = 'Данные устарели (' + ageMinutes + ' мин)'
                } else {
                    message = 'Данные актуальны (' + ageMinutes + ' мин)'
                }
            } catch (e) {
                status = 'unknown'
                message = 'Не удалось распарсить время обновления'
            }
        }

        const commodityCount = await prisma.commodity.count({ where: { enabled: true } })

        return {
            status,
            message,
            last_update: rates.actual_date,
            commodities_available: commodityCount,
            has_24h_comparison: true,
        }
    }
}
