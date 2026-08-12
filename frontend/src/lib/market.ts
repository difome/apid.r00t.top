import type { CommodityApiItem, MarketAsset, TrendDirection } from '@/types/market'

const commodityEmoji: Record<string, string> = {
  XAU: '🥇',
  XAG: '🥈',
  CL1: '🛢️',
  HG: '🧱',
  LC: '🔋',
}

const toNumber = (value: number | string | null | undefined, fallback = 0) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

const toDirection = (value: TrendDirection | null | undefined, fallback: TrendDirection): TrendDirection => {
  return value || fallback
}

export function commodityToMarketAsset(item: CommodityApiItem, lang: string): MarketAsset {
  const localizedName = lang === 'uk' ? (item.nameUa || item.name) : (item.nameRu || item.name)
  const currentPrice = toNumber(item.latestRate?.price ?? item.rate)
  const diff = toNumber(item.stats24h?.diff ?? item.change?.absolute)
  const percent = toNumber(item.stats24h?.percent ?? item.change?.percent)
  const direction = toDirection(item.stats24h?.direction ?? item.change?.direction, 'stable')

  return {
    key: item.symbol,
    name: localizedName,
    type: 'commodity',
    emoji: commodityEmoji[item.symbol] || '📦',
    latestRate: {
      price: currentPrice,
      diff,
      diffPercent: percent,
      direction,
      createdAt: item.latestRate?.createdAt,
    },
    stats24h: {
      oldPrice: toNumber(item.stats24h?.oldPrice ?? item.rate, currentPrice),
      diff,
      percent,
      direction,
    },
    baseName: localizedName,
    baseCurrency: item.symbol,
    targetCurrency: 'USD',
  }
}

export function getLatestUpdateTime(items: MarketAsset[]) {
  const times = items
    .map(item => item.latestRate.createdAt ? new Date(item.latestRate.createdAt).getTime() : NaN)
    .filter(Number.isFinite)

  return times.length > 0 ? new Date(Math.max(...times)) : null
}
