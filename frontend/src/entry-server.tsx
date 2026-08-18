import ReactDOMServer from 'react-dom/server'
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider, dehydrate } from '@tanstack/react-query'
import { createAppRouter } from './router'
import { initI18n  } from './i18n'
import type {Language} from './i18n';

export interface RenderOptions {
  lang: Language
}

export async function render(url: string, options: RenderOptions) {
  const { lang } = options
  initI18n(lang)

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  const memoryHistory = createMemoryHistory({
    initialEntries: [url],
  })

  const router = createAppRouter(queryClient, lang)
  router.update({
    history: memoryHistory,
  })

  await router.load()

  const appHtml = ReactDOMServer.renderToString(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )

  const dehydratedState = dehydrate(queryClient)

  let title = 'Apid'
  let headTags = ''

  for (const match of router.state.matches) {
    if (match.meta) {
      for (const m of match.meta) {
        if ('title' in m && m.title) {
          title = m.title
        } else if ('name' in m && 'content' in m && m.name && m.content) {
          headTags += `  <meta name="${m.name}" content="${m.content}">\n`
        } else if ('property' in m && 'content' in m && m.property && m.content) {
          headTags += `  <meta property="${m.property}" content="${m.content}">\n`
        }
      }
    }
    if (match.links) {
      for (const l of match.links) {
        if ('rel' in l && 'href' in l) {
          const hrefLangAttr = 'hrefLang' in l && l.hrefLang ? ` hreflang="${l.hrefLang}"` : ''
          headTags += `  <link rel="${l.rel}"${hrefLangAttr} href="${l.href}">\n`
        }
      }
    }
  }

  return {
    appHtml,
    title,
    headTags,
    dehydratedState,
    lang,
  }
}
