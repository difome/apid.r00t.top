export type Rate = {
  id: number
  currencyKey: string
  price: number
  diff: number
  diffPercent: number
  direction: 'up' | 'down' | 'neutral'
  createdAt: string
}

export type CurrencyData = {
  key: string
  name: string
  type: 'fiat' | 'crypto'
  source: string
  baseCurrency: string
  targetCurrency: string
  symbol: string
  emoji: string
  latestRate: Rate
  stats24h: {
    oldPrice: number
    diff: number
    percent: number
    direction: 'up' | 'down' | 'stable'
  }
  translatedName?: string
  baseName?: string
  targetName?: string
  params?: {
    translation?: {
      base?: Record<string, string | undefined>
      target?: Record<string, string | undefined>
    }
  } | null
}

export type CurrencyMeta = {
  symbol: string
  emoji: string
  name: string
  code: string
}

export type ApiResponse = {
  success: boolean
  data: CurrencyData[]
  currency_symbols: Record<string, CurrencyMeta>
}
