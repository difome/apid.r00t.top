import { createFileRoute } from '@tanstack/react-router'
import { TrafficTab } from '@/components/admin/TrafficTab'

export const Route = createFileRoute('/admin/traffic')({
  component: TrafficTab,
})
