import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { CommodityMarketPage } from '@/components/market/CommodityMarketPage'
import { useMetals } from '@/hooks/use-metals'

export const Route = createFileRoute('/metals')({
  component: MetalsPage,
})

function MetalsPage() {
  const { i18n } = useTranslation()
  const lang = i18n.language || 'ru'

  return (
    <CommodityMarketPage
      useData={useMetals}
      title={lang === 'uk' ? 'Дрогоцінні та промислові метали' : 'Драгоценные и промышленные металлы'}
      subtitle={lang === 'uk' ? 'Котирування дорогоцінних та промислових металів' : 'Котировки драгоценных и промышленных металлов'}
      documentTitle={lang === 'uk' ? 'Метали' : 'Металлы'}
    />
  )
}
