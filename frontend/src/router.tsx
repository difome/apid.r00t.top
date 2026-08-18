import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import type { QueryClient } from '@tanstack/react-query'
import type { Language } from './i18n'

export interface RouterContext {
  queryClient: QueryClient
  lang: Language
}

export function createAppRouter(queryClient: QueryClient, lang: Language = 'uk') {
  return createTanStackRouter({
    routeTree,
    context: {
      queryClient,
      lang,
    },
    defaultPreload: 'intent',
    scrollRestoration: true,
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}
