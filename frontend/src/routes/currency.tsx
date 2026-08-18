import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo, useEffect } from 'react'
import {
  useCurrencies,
  currenciesQueryOptions,
  CurrencyConverter,
  MarketOverview,
  HistoryChart,
} from '@/features/currency'
import { Skeleton } from "@/components/ui/skeleton"
import { useTranslation } from 'react-i18next'

import { createSeoHead } from '@/lib/seo'

export const Route = createFileRoute('/currency')({
  loader: ({ context }) => {
    if (typeof window === 'undefined') {
      return context.queryClient.ensureQueryData(currenciesQueryOptions())
    }
    void context.queryClient.prefetchQuery(currenciesQueryOptions())
  },
  head: () => createSeoHead({
    title: i18n.t('nav.currency'),
    description: i18n.t('currency.subtitle'),
    path: '/currency',
  }),
  component: CurrencyPage,
})

function CurrencyPage() {
  const { list, converterMap, symbolsMap, isLoading, isError, error } = useCurrencies()
  const { t, i18n } = useTranslation()
  const lang = i18n.language

  useEffect(() => {
    document.title = `${t('nav.currency')} | Apid`;
  }, [t]);

  const [selectedKey, setSelectedKey] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('currency');
    }
    return null;
  });

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setSelectedKey(params.get('currency'));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const latestUpdateTime = useMemo(() => {
    if (list.length === 0) return null
    const times = list.map(c => new Date(c.latestRate.createdAt).getTime()).filter(timeVal => !isNaN(timeVal))
    if (times.length === 0) return null
    const maxTime = Math.max(...times)
    return new Date(maxTime)
  }, [list])

  const formattedUpdateTime = useMemo(() => {
    if (!latestUpdateTime) return ''
    return latestUpdateTime.toLocaleString(lang === 'uk' ? 'uk-UA' : 'ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }, [latestUpdateTime, lang])

  if (isLoading && list.length === 0) {
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
              {[...Array(10)].map((_, i) => (
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

  if (isError) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-400">
        Не удалось загрузить валюты: {error.message}
      </div>
    )
  }

  return (
    <div className="page-shell animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {t('currency.title')}
          </h1>
          <p className="page-subtitle">{t('currency.subtitle')}</p>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="content-card p-5 text-sm text-muted-foreground">
          Нет данных для отображения.
        </div>
      ) : (
        <>
          <CurrencyConverter
            converterMap={converterMap}
            symbolsMap={symbolsMap}
          />

          <MarketOverview
            currencies={list}
            converterMap={converterMap}
            symbolsMap={symbolsMap}
            onSelect={setSelectedKey}
          />
        </>
      )}

      {/* History Dialog */}
      <HistoryChart
        selectedKey={selectedKey}
        onClose={() => setSelectedKey(null)}
      />

      {/* Footer info */}
      {formattedUpdateTime && (
        <div className="flex justify-center pt-6 border-t border-border">
          <div className="bg-card px-4 py-2 rounded-lg border border-border text-xs text-muted-foreground font-medium">
            {lang === 'uk' ? `Актуально на: ${formattedUpdateTime}` : `Актуально на: ${formattedUpdateTime}`}
          </div>
        </div>
      )}
    </div>
  )
}
