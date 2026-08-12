import { createFileRoute } from '@tanstack/react-router'
import { ParsingTab } from '@/components/admin/ParsingTab'

export const Route = createFileRoute('/admin/parsing')({
  component: ParsingTab,
})
