import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { CommodityMarketPage } from '@/components/market/CommodityMarketPage'
import { useCommodities } from '@/hooks/use-commodities'

export const Route = createFileRoute('/commodities')({
  component: CommoditiesPage,
})

function CommoditiesPage() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language || 'ru'

  return (
    <CommodityMarketPage
      useData={useCommodities}
      title={lang === 'uk' ? 'Сировинні товари' : 'Сырьевые товары'}
      subtitle={lang === 'uk' ? 'Котирування сировинних товарів' : 'Котировки сырьевых товаров'}
      documentTitle={t('nav.commodities', 'Сырьевые товары')}
    />
  )
}
