import { createFileRoute } from '@tanstack/react-router'
import { Image as ImageIcon, Shuffle } from "lucide-react"
import { useRandomMeme, memesQueryOptions } from '@/features/memes'
import { useTranslation } from 'react-i18next'
import { createSeoHead } from '@/lib/seo'
import i18n from '@/i18n'

export const Route = createFileRoute('/memes')({
  loader: ({ context }) => {
    if (typeof window === 'undefined') {
      return context.queryClient.ensureQueryData(memesQueryOptions())
    }
    void context.queryClient.prefetchQuery(memesQueryOptions())
  },
  head: () => createSeoHead({
    title: i18n.t('nav.memes'),
    description: i18n.t('memes.subtitle'),
    path: '/memes',
  }),
  component: MemesPage,
})

const getMemeImageUrl = (url: string | undefined | null) => {
  if (!url) return ''
  if (url.startsWith('http://127.0.0.1') || url.startsWith('http://localhost')) {
    return url.replace(/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?/, '')
  }
  return url
}

function MemesPage() {
  const { data, isLoading, refetch, isRefetching } = useRandomMeme()
  const { t } = useTranslation()
  const meme = data?.success ? data.data.result : null

  return (
    <div className="page-shell max-w-2xl mx-auto">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <ImageIcon className="page-title-icon" /> {t('memes.title')}
          </h1>
          <p className="page-subtitle">{t('memes.subtitle')}</p>
        </div>
        <button 
          onClick={() => refetch()}
          disabled={isRefetching}
          className="page-action active:scale-[0.98]"
        >
          <Shuffle className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
          {isRefetching ? t('memes.loading') : t('memes.next')}
        </button>
      </div>

      {isLoading && !meme ? (
        <div className="aspect-square content-card animate-pulse" />
      ) : meme && (
        <div className={`space-y-5 transition-all duration-500 ${isRefetching ? 'opacity-50 scale-[0.99]' : 'opacity-100 scale-100'}`}>
          <div className="content-card overflow-hidden flex items-center justify-center min-h-[300px]">
            <img 
              src={getMemeImageUrl(meme.image)} 
              alt={meme.description} 
              className="w-full h-auto object-contain max-h-[50vh] md:max-h-[60vh] mx-auto animate-in fade-in zoom-in duration-500"
              loading="lazy"
            />
          </div>
          <div className="text-center">
             <p className="text-lg md:text-xl font-semibold tracking-tight text-foreground/90">{meme.description}</p>
          </div>
        </div>
      )}
    </div>
  )
}
