import { z } from "zod";

export const CreateCommoditySchema = z.object({
    symbol: z.string().min(1).max(20),
    name: z.string().min(1),
    nameRu: z.string().optional(),
    nameUa: z.string().optional(),
    category: z.enum(["metals_precious","metals_base","metals_other","energy","grains","softs","livestock","other"]),
    unit: z.string(),
    exchange: z.string().optional(),
    source: z.string().default("investing"),
    params: z.record(z.string(), z.unknown()).optional(),
    order: z.number().int().default(0),
    enabled: z.boolean().default(true),
});

export const UpdateCommoditySchema = z.object({
    symbol: z.string().min(1).max(20).optional(),
    name: z.string().min(1).optional(),
    nameRu: z.string().optional(),
    nameUa: z.string().optional(),
    category: z.enum(["metals_precious","metals_base","metals_other","energy","grains","softs","livestock","other"]).optional(),
    unit: z.string().optional(),
    exchange: z.string().optional(),
    source: z.string().optional(),
    params: z.record(z.string(), z.unknown()).optional(),
    order: z.number().int().optional(),
    enabled: z.boolean().optional(),
});

export const HistoryQuerySchema = z.object({
    days: z.string().optional().default("30").describe('Количество дней для выборки (например: 7, 30, 90, 365, max)').transform(v => {
        if (!v) return 30;
        const clean = v.toLowerCase().trim();
        if (clean === "1d" || clean === "1") return 1;
        if (clean === "7d" || clean === "7") return 7;
        if (clean === "30d" || clean === "30") return 30;
        if (clean === "90d" || clean === "90") return 90;
        if (clean === "365d" || clean === "365" || clean === "1y" || clean === "year") return 365;
        if (clean === "max" || clean === "all") return 99999;
        const parsed = parseInt(clean);
        return isNaN(parsed) ? 30 : parsed;
    }),
    year: z.string().optional().describe('Конкретный год для выборки (например, 2024). Если передан, days игнорируется.').transform(v => v ? parseInt(v) : undefined),
});

export const CommodityResponseSchema = z.object({
    symbol: z.string(),
    name: z.string(),
    nameRu: z.string().nullable(),
    nameUa: z.string().nullable(),
    category: z.string(),
    unit: z.string(),
    price: z.number(),
    change24h: z.number().nullable(),
    changePercent24h: z.number().nullable(),
    high24h: z.number().nullable(),
    low24h: z.number().nullable(),
    updatedAt: z.string(),
});

export const RateResponseSchema = z.object({
    price: z.number(),
    createdAt: z.date(),
});

export type CreateCommodityInput = z.infer<typeof CreateCommoditySchema>;
export type UpdateCommodityInput = z.infer<typeof UpdateCommoditySchema>;
