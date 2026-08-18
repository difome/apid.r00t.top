import { createFileRoute } from '@tanstack/react-router'
import { Lightbulb, RefreshCw } from "lucide-react"
import { useRandomFact, factsQueryOptions } from '@/features/facts'
import { useTranslation } from 'react-i18next'
import { createSeoHead } from '@/lib/seo'
import i18n from '@/i18n'

export const Route = createFileRoute('/facts')({
  loader: ({ context }) => {
    if (typeof window === 'undefined') {
      return context.queryClient.ensureQueryData(factsQueryOptions())
    }
    void context.queryClient.prefetchQuery(factsQueryOptions())
  },
  head: () => createSeoHead({
    title: i18n.t('nav.facts'),
    description: i18n.t('facts.subtitle'),
    path: '/facts',
  }),
  component: FactsPage,
})

function FactsPage() {
  const { t } = useTranslation()
  const { data, isLoading, refetch, isRefetching } = useRandomFact()
  const fact = data?.success ? data.data.result : null

  return (
    <div className="page-shell text-center max-w-3xl mx-auto">
      <div>
        <h1 className="page-title justify-center">
          <Lightbulb className="page-title-icon" /> {t('facts.title')}
        </h1>
        <p className="page-subtitle mx-auto">{t('facts.subtitle')}</p>
      </div>

      <div className="relative group">
        <div className={`content-card p-8 md:p-10 transition-all duration-500 ${isRefetching ? 'scale-[0.99] opacity-50' : 'scale-100 opacity-100'}`}>
          {isLoading && !fact ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-6 bg-secondary/50 rounded w-full"></div>
              <div className="h-6 bg-secondary/50 rounded w-3/4 mx-auto"></div>
            </div>
          ) : (
            <p className="text-xl md:text-2xl font-semibold leading-relaxed">
              {typeof fact === 'object' ? fact?.content : fact}
            </p>
          )}
        </div>
      </div>

      <button 
        onClick={() => refetch()}
        disabled={isRefetching}
        className="page-action active:scale-[0.98] mx-auto"
      >
        <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
        {isRefetching ? t('facts.thinking') : t('facts.next')}
      </button>
    </div>
  )
}
