import { createFileRoute } from '@tanstack/react-router'
import { SettingsTab } from '@/components/admin/SettingsTab'

export const Route = createFileRoute('/admin/settings')({
  component: SettingsTab,
})
