import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { CommodityMarketPage, useMetals, metalsQueryOptions } from '@/features/market'
import { createSeoHead } from '@/lib/seo'
import i18n from '@/i18n'

export const Route = createFileRoute('/metals')({
  loader: ({ context }) => {
    return context.queryClient.ensureQueryData(metalsQueryOptions())
  },
  head: () => createSeoHead({
    title: i18n.t('metals.pageTitle'),
    description: i18n.t('metals.description'),
    path: '/metals',
  }),
  component: MetalsPage,
})

function MetalsPage() {
  const { t } = useTranslation()

  return (
    <CommodityMarketPage
      useData={useMetals}
      title={t('metals.title')}
      subtitle={t('metals.subtitle')}
      documentTitle={t('metals.pageTitle')}
    />
  )
}
