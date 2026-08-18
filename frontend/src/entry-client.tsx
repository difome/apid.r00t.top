import ReactDOM from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider, hydrate } from '@tanstack/react-query'
import { createAppRouter } from './router'
import { detectClientLanguage, initI18n } from './i18n'

declare global {
  interface Window {
    __INITIAL_DATA__?: any
    __INITIAL_LANG__?: any
  }
}

const clientLang = window.__INITIAL_LANG__ || detectClientLanguage()
initI18n(clientLang)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => error?.response?.status !== 401 && failureCount < 1,
      staleTime: 1000 * 60,
    },
  },
})

if (window.__INITIAL_DATA__) {
  hydrate(queryClient, window.__INITIAL_DATA__)
}

const router = createAppRouter(queryClient, clientLang)

const rootElement = document.getElementById('app')!

if (rootElement.hasChildNodes()) {
  ReactDOM.hydrateRoot(
    rootElement,
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
} else {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
