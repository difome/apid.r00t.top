import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { UseQueryResult } from '@tanstack/react-query'
import { HistoryChart } from '@/components/currency/HistoryChart'
import { MarketOverview } from '@/components/currency/MarketOverview'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrencies } from '@/hooks/use-currencies'
import { commodityToMarketAsset, getLatestUpdateTime } from '@/lib/market'
import type { CommodityApiItem, ListResponse } from '@/types/market'

type CommodityMarketPageProps = {
  useData: () => UseQueryResult<ListResponse<CommodityApiItem>, Error>
  title: string
  subtitle: string
  documentTitle: string
}

function MarketTableSkeleton() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500 py-6">
      <div className="flex justify-between items-end">
        <div>
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="w-full overflow-x-auto bg-card border border-border rounded-xl shadow-lg mt-6">
        <table className="w-full border-collapse text-left whitespace-nowrap">
          <thead>
            <tr className="border-b border-border bg-secondary/20 h-12">
              <th className="px-6 py-4 w-12"><Skeleton className="h-4 w-4 mx-auto" /></th>
              <th className="px-6 py-4"><Skeleton className="h-4 w-16" /></th>
              <th className="px-6 py-4"><Skeleton className="h-4 w-20 ml-auto" /></th>
              <th className="px-6 py-4"><Skeleton className="h-4 w-16 ml-auto" /></th>
              <th className="px-6 py-4"><Skeleton className="h-4 w-16 ml-auto" /></th>
              <th className="px-6 py-4"><Skeleton className="h-4 w-24 ml-auto" /></th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-border">
                <td className="px-6 py-4"><Skeleton className="h-4 w-4 mx-auto" /></td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-8 h-8 rounded-sm" />
                    <div className="flex flex-col gap-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4"><Skeleton className="h-5 w-20 ml-auto" /></td>
                <td className="px-6 py-4"><Skeleton className="h-4 w-16 ml-auto" /></td>
                <td className="px-6 py-4"><Skeleton className="h-4 w-16 ml-auto" /></td>
                <td className="px-6 py-4"><Skeleton className="h-8 w-24 ml-auto" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function CommodityMarketPage({ useData, title, subtitle, documentTitle }: CommodityMarketPageProps) {
  const { converterMap, symbolsMap } = useCurrencies()
  const { data, isLoading, isError, error } = useData()
  const { i18n } = useTranslation()
  const lang = i18n.language || 'ru'
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  useEffect(() => {
    document.title = `${documentTitle} | Apid`
  }, [documentTitle])

  const assets = useMemo(() => {
    return data?.data.map(item => commodityToMarketAsset(item, lang)) ?? []
  }, [data, lang])

  const latestUpdateTime = useMemo(() => getLatestUpdateTime(assets), [assets])

  const formattedUpdateTime = useMemo(() => {
    if (!latestUpdateTime) return ''
    return latestUpdateTime.toLocaleString(lang === 'uk' ? 'uk-UA' : 'ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }, [latestUpdateTime, lang])

  if (isLoading && assets.length === 0) return <MarketTableSkeleton />

  if (isError) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-400">
        {i18n.t('common.errorLoading')}: {error.message}
      </div>
    )
  }

  return (
    <div className="page-shell animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {title}
          </h1>
          <p className="page-subtitle">{subtitle}</p>
        </div>
      </div>

      {assets.length === 0 ? (
        <div className="content-card p-5 text-sm text-muted-foreground">
          {i18n.t('common.noData')}
        </div>
      ) : (
        <MarketOverview
          currencies={assets}
          converterMap={converterMap}
          symbolsMap={symbolsMap}
          onSelect={setSelectedKey}
          showTabs={false}
          defaultTab="commodity"
        />
      )}

      <HistoryChart
        selectedKey={selectedKey}
        onClose={() => setSelectedKey(null)}
        basePath="/commodities"
        currencyData={assets.find(item => item.key === selectedKey)}
      />

      {formattedUpdateTime && (
        <div className="flex justify-center pt-6 border-t border-border">
          <div className="bg-card px-4 py-2 rounded-lg border border-border text-xs text-muted-foreground font-medium">
            {i18n.t('currency.updatedAt', { time: formattedUpdateTime })}
          </div>
        </div>
      )}
    </div>
  )
}
