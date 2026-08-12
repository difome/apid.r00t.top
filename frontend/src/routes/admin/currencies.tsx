import { createFileRoute } from '@tanstack/react-router'
import { CurrenciesTab } from '@/components/admin/CurrenciesTab'

export const Route = createFileRoute('/admin/currencies')({
  component: CurrenciesTab,
})
