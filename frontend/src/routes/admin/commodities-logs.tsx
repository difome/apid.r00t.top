import { createFileRoute } from '@tanstack/react-router'
import { CommoditiesLogsTab } from '@/components/admin/CommoditiesLogsTab'

export const Route = createFileRoute('/admin/commodities-logs')({
  component: CommoditiesLogsTab,
})
