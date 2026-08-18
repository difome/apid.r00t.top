import { createFileRoute } from '@tanstack/react-router'
import SwaggerUI from 'swagger-ui-react'
import 'swagger-ui-react/swagger-ui.css'
import { useEffect, useState } from 'react'
import { Server } from 'lucide-react'
import { createSeoHead } from '@/lib/seo'
import i18n from '@/i18n'

export const Route = createFileRoute('/docs')({
  head: () => createSeoHead({
    title: i18n.t('docs.title'),
    description: i18n.t('docs.description'),
    path: '/docs',
  }),
  component: DocsPage,
})

function DocsPage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="page-shell min-h-screen">
      {/* Header bar */}
      <div className="page-header content-card p-5">
        <h1 className="page-title">
          {i18n.t('docs.title')}
        </h1>
        <a 
          href="/swagger" 
          target="_blank" 
          rel="noreferrer" 
           className="page-action whitespace-nowrap"
        >
          <Server className="w-3.5 h-3.5 mr-2" />
          Native Swagger UI
        </a>
      </div>

      {/* Swagger UI Container */}
      <div className="flex-1 rounded-xl overflow-hidden border border-border p-4 bg-white dark:bg-[#e6e6e6] swagger-wrapper transition-colors">
        <style dangerouslySetInnerHTML={{__html: `
          .dark .swagger-wrapper {
            filter: invert(92%) hue-rotate(180deg);
          }
          .dark .swagger-ui .opblock .opblock-summary-method {
            filter: invert(100%) hue-rotate(180deg); /* fix method colors so they look normal */
          }
        `}} />
        {mounted ? (
          <SwaggerUI url="/swagger/json" />
        ) : (
          <div className="flex items-center justify-center p-12 text-muted-foreground">
            {i18n.t('common.loading')}
          </div>
        )}
      </div>
    </div>
  )
}
