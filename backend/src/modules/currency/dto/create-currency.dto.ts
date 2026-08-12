import { z } from 'zod';

export const CreateCurrencySchema = z.object({
    key: z.string().min(1).max(50).default('usd_rub'),
    name: z.string().min(1).default('Доллар / Рубль'),
    type: z.enum(['crypto', 'fiat']).default('fiat'),
    source: z.enum(['coinbase', 'cbr', 'minfin', 'wise']).default('cbr'),
    baseCurrency: z.string().length(3).toUpperCase().default('USD'),
    targetCurrency: z.string().length(3).toUpperCase().default('RUB'),
    symbol: z.string().optional().default('₽'),
    emoji: z.string().optional().default('💵'),
    params: z.record(z.string(), z.unknown()).optional(),
    order: z.number().int().default(0),
    enabled: z.boolean().default(true),
});

export type CreateCurrencyDto = z.infer<typeof CreateCurrencySchema>;