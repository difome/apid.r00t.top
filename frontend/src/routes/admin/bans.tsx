import { createFileRoute } from '@tanstack/react-router'
import { BansTab } from '@/components/admin/BansTab'

export const Route = createFileRoute('/admin/bans')({
  component: BansTab,
})
