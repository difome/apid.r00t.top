import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { fetchCurrencies, fetchHistory, fetchAvailableYears } from './api'
import type { CurrencyMeta } from './types'
import { useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '@/hooks/use-language'

export const currenciesQueryOptions = () =>
  queryOptions({
    queryKey: ['currencies'],
    queryFn: fetchCurrencies,
    staleTime: Infinity,
  })

export function useCurrencies() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const { lang } = useLanguage()

  const query = useQuery(currenciesQueryOptions())

  useEffect(() => {
    if (typeof window === 'undefined') return

    let eventSource: EventSource | null = null
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    let closed = false

    const connect = () => {
      const base = api.defaults.baseURL || '/api/v2'
      eventSource = new EventSource(`${base}/currency/rates/stream`)

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data && data.success) {
            queryClient.setQueryData(['currencies'], data)
          }
        } catch {
          queryClient.invalidateQueries({ queryKey: ['currencies'] })
        }
      }

      eventSource.onerror = () => {
        eventSource?.close()
        queryClient.invalidateQueries({ queryKey: ['currencies'] })
        if (!closed) {
          retryTimer = setTimeout(connect, 5000)
        }
      }
    }

    connect()

    return () => {
      closed = true
      eventSource?.close()
      if (retryTimer) clearTimeout(retryTimer)
    }
  }, [queryClient])

  const meta = useMemo(() => {
    if (!query.data?.success) return { converterMap: {}, symbolsMap: {}, list: [] }

    const currencies = query.data.data
    const cMap: Record<string, number> = {}
    const sMap: Record<string, CurrencyMeta> = {}
    const currentLang = lang || 'uk'

    const cleanList = currencies.map((c) => {
      const trans = c.params?.translation
      const baseName =
        trans?.base?.[currentLang] ||
        t(`currency_codes.${c.baseCurrency.toUpperCase()}`) ||
        c.baseCurrency
      const targetName =
        trans?.target?.[currentLang] ||
        t(`currency_codes.${c.targetCurrency.toUpperCase()}`) ||
        c.targetCurrency

      return {
        ...c,
        name: c.name.replace('/', ' / '),
        translatedName: `${baseName} / ${targetName}`,
        baseName,
        targetName,
      }
    })

    cleanList.forEach((c) => {
      cMap[c.key] = Number(c.latestRate.price)

      const base = c.baseCurrency.toUpperCase()
      const trans = c.params?.translation

      if (!sMap[base]) {
        const isBaseMain = base !== 'USD'
        sMap[base] = {
          symbol: isBaseMain ? c.symbol : '$',
          emoji: isBaseMain ? c.emoji : '💵',
          name: trans?.base?.[currentLang] || t(`currency_codes.${base}`) || base,
          code: base,
        }
      }

      const target = c.targetCurrency.toUpperCase()
      if (!sMap[target]) {
        const isTargetMain = target !== 'USD'
        sMap[target] = {
          symbol: isTargetMain ? c.symbol : '$',
          emoji: isTargetMain ? c.emoji : '💵',
          name: trans?.target?.[currentLang] || t(`currency_codes.${target}`) || target,
          code: target,
        }
      }
    })

    return {
      converterMap: cMap,
      symbolsMap: sMap,
      list: cleanList,
    }
  }, [query.data, t, lang])

  return {
    ...query,
    ...meta,
  }
}

export function useCurrencyHistory(
  key: string | null,
  days: number = 30,
  year?: number,
  startDate?: string,
  endDate?: string,
  basePath: string = '/currency'
) {
  return useQuery({
    queryKey: ['history', key, days, year, startDate, endDate, basePath],
    queryFn: () => fetchHistory(key!, days, year, startDate, endDate, basePath),
    enabled: !!key,
  })
}

export function useCurrencyYears(key: string | null, basePath: string = '/currency') {
  return useQuery({
    queryKey: ['years', key, basePath],
    queryFn: () => fetchAvailableYears(key!, basePath),
    enabled: !!key,
  })
}
