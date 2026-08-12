import { prisma } from "@/lib/prisma"

const COMMODITIES = [
    // PRECIOUS METALS
    { symbol: 'XAU', name: 'Gold', nameRu: 'Золото', nameUa: 'Золото', category: 'metals_precious' as const, unit: 'oz', exchange: 'COMEX' },
    { symbol: 'XAG', name: 'Silver', nameRu: 'Серебро', nameUa: 'Срібло', category: 'metals_precious' as const, unit: 'oz', exchange: 'COMEX' },
    { symbol: 'XPT', name: 'Platinum', nameRu: 'Платина', nameUa: 'Платина', category: 'metals_precious' as const, unit: 'oz', exchange: 'NYMEX' },
    { symbol: 'XPD', name: 'Palladium', nameRu: 'Палладий', nameUa: 'Паладій', category: 'metals_precious' as const, unit: 'oz', exchange: 'NYMEX' },
    // BASE METALS
    { symbol: 'HG', name: 'Copper', nameRu: 'Медь', nameUa: 'Мідь', category: 'metals_base' as const, unit: 'lb', exchange: 'COMEX' },
    { symbol: 'ALI', name: 'Aluminum', nameRu: 'Алюминий', nameUa: 'Алюміній', category: 'metals_base' as const, unit: 'mt', exchange: 'LME' },
    { symbol: 'NI', name: 'Nickel', nameRu: 'Никель', nameUa: 'Нікель', category: 'metals_base' as const, unit: 'mt', exchange: 'LME' },
    { symbol: 'ZN', name: 'Zinc', nameRu: 'Цинк', nameUa: 'Цинк', category: 'metals_base' as const, unit: 'mt', exchange: 'LME' },
    { symbol: 'PB', name: 'Lead', nameRu: 'Свинец', nameUa: 'Свинець', category: 'metals_base' as const, unit: 'mt', exchange: 'LME' },
    { symbol: 'SN', name: 'Tin', nameRu: 'Олово', nameUa: 'Олово', category: 'metals_base' as const, unit: 'mt', exchange: 'LME' },
    // OTHER METALS
    { symbol: 'JBP', name: 'Steel HRC Futures', nameRu: 'Сталь', nameUa: 'Сталь', category: 'metals_other' as const, unit: 'mt', exchange: 'LME' },
    { symbol: 'LC', name: 'Lithium', nameRu: 'Литий', nameUa: 'Літій', category: 'metals_other' as const, unit: 'mt', exchange: 'LME' },
    { symbol: 'UXA', name: 'Uranium', nameRu: 'Уран', nameUa: 'Уран', category: 'metals_other' as const, unit: 'lb', exchange: 'NYMEX' },
    // ENERGY
    { symbol: 'CL1', name: 'Crude Oil WTI', nameRu: 'Нефть WTI', nameUa: 'Нафта WTI', category: 'energy' as const, unit: 'bbl', exchange: 'NYMEX' },
    { symbol: 'CO1', name: 'Brent Oil', nameRu: 'Нефть Brent', nameUa: 'Нафта Brent', category: 'energy' as const, unit: 'bbl', exchange: 'ICE' },
    { symbol: 'NG/USD', name: 'Natural Gas', nameRu: 'Природный газ', nameUa: 'Природний газ', category: 'energy' as const, unit: 'mmBtu', exchange: 'NYMEX' },
    { symbol: 'XB1', name: 'RBOB Gasoline', nameRu: 'Бензин', nameUa: 'Бензин', category: 'energy' as const, unit: 'gal', exchange: 'NYMEX' },
    // GRAINS
    { symbol: 'W_1', name: 'Wheat', nameRu: 'Пшеница', nameUa: 'Пшениця', category: 'grains' as const, unit: 'bushel', exchange: 'CBOT' },
    { symbol: 'C_1', name: 'Corn', nameRu: 'Кукуруза', nameUa: 'Кукурудза', category: 'grains' as const, unit: 'bushel', exchange: 'CBOT' },
    { symbol: 'S_1', name: 'Soybeans', nameRu: 'Соя', nameUa: 'Соя', category: 'grains' as const, unit: 'bushel', exchange: 'CBOT' },
    { symbol: 'O_1', name: 'Oats', nameRu: 'Овес', nameUa: 'Овес', category: 'grains' as const, unit: 'bushel', exchange: 'CBOT' },
    // SOFTS
    { symbol: 'KC1', name: 'Coffee', nameRu: 'Кофе', nameUa: 'Кава', category: 'softs' as const, unit: 'lb', exchange: 'ICE' },
    { symbol: 'CC1', name: 'Cocoa', nameRu: 'Какао', nameUa: 'Какао', category: 'softs' as const, unit: 'mt', exchange: 'ICE' },
    { symbol: 'SB1', name: 'Sugar', nameRu: 'Сахар', nameUa: 'Цукор', category: 'softs' as const, unit: 'lb', exchange: 'ICE' },
    { symbol: 'CT1', name: 'Cotton', nameRu: 'Хлопок', nameUa: 'Бавовна', category: 'softs' as const, unit: 'lb', exchange: 'ICE' },
    // LIVESTOCK
    { symbol: 'LH1', name: 'Lean Hogs', nameRu: 'Свиньи', nameUa: 'Свині', category: 'livestock' as const, unit: 'lb', exchange: 'CME' },
    { symbol: 'LC1', name: 'Live Cattle', nameRu: 'Крупный рогатый скот', nameUa: 'Велика рогата худоба', category: 'livestock' as const, unit: 'lb', exchange: 'CME' },
    { symbol: 'FC1', name: 'Feeder Cattle', nameRu: 'Молодой скот', nameUa: 'Молода худоба', category: 'livestock' as const, unit: 'lb', exchange: 'CME' },
    // OTHER
    { symbol: 'RR1', name: 'Rough Rice', nameRu: 'Рис', nameUa: 'Рис', category: 'other' as const, unit: 'cwt', exchange: 'CBOT' },
    { symbol: 'JO1', name: 'Orange Juice', nameRu: 'Апельсиновый сок', nameUa: 'Апельсиновий сік', category: 'other' as const, unit: 'lb', exchange: 'ICE' },
    { symbol: 'RS1', name: 'Canola', nameRu: 'Рапс', nameUa: 'Ріпак', category: 'other' as const, unit: 'mt', exchange: 'ICE' },
    { symbol: 'LB1', name: 'Lumber', nameRu: 'Пиломатериалы', nameUa: 'Пиломатеріали', category: 'other' as const, unit: 'mbf', exchange: 'CME' },
    { symbol: 'DL1', name: 'Ethanol', nameRu: 'Этанол', nameUa: 'Етанол', category: 'other' as const, unit: 'gal', exchange: 'CBOT' },
]

export async function seedCommodities() {
    console.log('🌱 Seeding commodities...')
    let created = 0
    let skipped = 0

    for (let i = 0; i < COMMODITIES.length; i++) {
        const c = COMMODITIES[i]
        const existing = await prisma.commodity.findUnique({ where: { symbol: c.symbol } })
        if (existing) {
            skipped++
            continue
        }
        await prisma.commodity.create({
            data: {
                ...c,
                source: 'investing',
                order: i,
                enabled: true,
                params: {} as any,
            }
        })
        created++
    }

    console.log(`✅ Commodities seeded: ${created} created, ${skipped} skipped (already exist)`)
    return { created, skipped }
}

// Allow running directly
const isMain = process.argv[1]?.endsWith('commodities.seed.ts') || process.argv[1]?.endsWith('commodities.seed.js')
if (isMain) {
    seedCommodities()
        .then(r => {
            console.log(r)
            process.exit(0)
        })
        .catch(e => {
            console.error(e)
            process.exit(1)
        })
}
