import type { HistoryPoint } from '@/types/market'

export type ChartPoint = {
  uniqueId: string
  date: string
  rawDate: string
  price: number
}

export function getLocale(lang: string) {
  return lang === 'uk' ? 'uk-UA' : lang === 'ru' ? 'ru-RU' : 'en-US'
}

export function formatDateForInput(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function toChartPoints(points: HistoryPoint[], lang: string, isIntraday: boolean): ChartPoint[] {
  const locale = getLocale(lang)

  return points.map(point => {
    const dt = new Date(point.createdAt)

    return {
      uniqueId: point.createdAt,
      date: isIntraday
        ? dt.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
        : dt.toLocaleDateString(locale, { day: 'numeric', month: 'short' }),
      rawDate: isIntraday
        ? `${dt.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })} ${dt.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}`
        : dt.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }),
      price: Number(point.price),
    }
  })
}

export function getChartStats(data: ChartPoint[]) {
  if (data.length < 2) return { change: 0, percent: 0, direction: 'neutral' as const }

  const firstPrice = data[0].price
  const lastPrice = data[data.length - 1].price
  const change = lastPrice - firstPrice
  const percent = firstPrice > 0 ? (change / firstPrice) * 100 : 0
  const direction = change > 0.000001 ? 'up' : change < -0.000001 ? 'down' : 'neutral'

  return { change, percent, direction }
}
