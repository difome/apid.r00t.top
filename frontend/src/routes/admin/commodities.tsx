import { createFileRoute } from '@tanstack/react-router'
import { CommoditiesTab } from '@/components/admin/CommoditiesTab'

export const Route = createFileRoute('/admin/commodities')({
  component: CommoditiesTab,
})
