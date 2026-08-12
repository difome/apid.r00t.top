import { z } from 'zod'

export const ConvertSchema = z.object({
    amount: z.number().positive().default(100).describe('Сумма для конвертации'),
    from_currency: z.string().default('usd').describe('Исходная валюта'),
    to_currencies: z.array(z.string()).min(1).default(['rub', 'eur', 'uah']).describe('Массив целевых валют'),
    exclude_source: z.boolean().optional().default(false).describe('Исключить исходную валюту из результатов'),
})

export const CurrencyParamSchema = z.object({
    pair: z.string(),
})

export type ConvertInput = z.infer<typeof ConvertSchema>