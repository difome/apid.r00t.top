import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { CommodityMarketPage, useCommodities, commoditiesQueryOptions } from '@/features/market'
import { createSeoHead } from '@/lib/seo'
import i18n from '@/i18n'

export const Route = createFileRoute('/commodities')({
  loader: ({ context }) => {
    if (typeof window === 'undefined') {
      return context.queryClient.ensureQueryData(commoditiesQueryOptions())
    }
    void context.queryClient.prefetchQuery(commoditiesQueryOptions())
  },
  head: () => createSeoHead({
    title: i18n.t('commodities.pageTitle'),
    description: i18n.t('commodities.description'),
    path: '/commodities',
  }),
  component: CommoditiesPage,
})

function CommoditiesPage() {
  const { t } = useTranslation()

  return (
    <CommodityMarketPage
      useData={useCommodities}
      title={t('commodities.title')}
      subtitle={t('commodities.subtitle')}
      documentTitle={t('commodities.pageTitle')}
    />
  )
}
