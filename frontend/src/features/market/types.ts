export type TrendDirection = 'up' | 'down' | 'neutral' | 'stable'

export type MarketRate = {
  price: number | string
  diff?: number | string | null
  diffPercent?: number | string | null
  direction?: TrendDirection | null
  createdAt?: string
}

export type MarketStats24h = {
  oldPrice: number
  diff: number
  percent: number
  direction: TrendDirection
}

export type MarketAsset = {
  key: string
  name: string
  type: 'fiat' | 'crypto' | 'commodity'
  baseCurrency: string
  targetCurrency: string
  emoji?: string
  symbol?: string
  latestRate: MarketRate
  stats24h: MarketStats24h
  translatedName?: string
  baseName?: string
  targetName?: string
  params?: {
    translation?: Record<string, Record<string, string | undefined> | undefined>
  } | null
}

export type CommodityApiItem = {
  symbol: string
  name: string
  nameRu?: string | null
  nameUa?: string | null
  rate?: number | string | null
  latestRate?: MarketRate | null
  stats24h?: Partial<MarketStats24h> | null
  change?: {
    absolute?: number | string | null
    percent?: number | string | null
    direction?: TrendDirection | null
  } | null
}

export type ListResponse<T> = {
  success: boolean
  data: T[]
}

export type HistoryPoint = {
  createdAt: string
  price: number | string
}

export type HistoryResponse = ListResponse<HistoryPoint>
