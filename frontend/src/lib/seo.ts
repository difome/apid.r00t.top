export interface SeoOptions {
  title: string
  description?: string
  image?: string
  path?: string
  type?: 'website' | 'article'
  noindex?: boolean
}

export function createSeoHead({
  title,
  description = 'Apid - Фінансові дані, курси валют, котирування сировини, металів, фільми та свята.',
  image = '/icon.png',
  path = '',
  type = 'website',
  noindex = false,
}: SeoOptions) {
  const domain = 'https://apid.r00t.top'
  const cleanPath = path ? (path.startsWith('/') ? path : `/${path}`) : ''
  const fullUrl = `${domain}${cleanPath}`
  const imageUrl = image.startsWith('http') ? image : `${domain}${image.startsWith('/') ? image : `/${image}`}`

  return {
    meta: [
      { title: `${title} | Apid` },
      { name: 'description', content: description },
      { name: 'robots', content: noindex ? 'noindex, nofollow' : 'index, follow' },
      // OpenGraph
      { property: 'og:site_name', content: 'Apid' },
      { property: 'og:title', content: `${title} | Apid` },
      { property: 'og:description', content: description },
      { property: 'og:url', content: fullUrl },
      { property: 'og:type', content: type },
      { property: 'og:image', content: imageUrl },
      // Twitter
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: `${title} | Apid` },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: imageUrl },
    ],
    links: [
      { rel: 'canonical', href: fullUrl },
      { rel: 'alternate', hrefLang: 'uk', href: `${domain}${cleanPath}?hl=uk` },
      { rel: 'alternate', hrefLang: 'ru', href: `${domain}${cleanPath}?hl=ru` },
      { rel: 'alternate', hrefLang: 'x-default', href: fullUrl },
    ],
  }
}
