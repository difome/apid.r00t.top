import { createFileRoute } from '@tanstack/react-router'
import { Film, Star, Calendar, RefreshCw, Flame } from "lucide-react"
import { useRandomMovie, moviesQueryOptions } from '@/features/movies'
import { useTranslation } from 'react-i18next'
import { createSeoHead } from '@/lib/seo'
import i18n from '@/i18n'

export const Route = createFileRoute('/movies')({
  loader: ({ context }) => {
    return context.queryClient.ensureQueryData(moviesQueryOptions())
  },
  head: () => createSeoHead({
    title: i18n.t('nav.movies'),
    description: i18n.t('movies.subtitle'),
    path: '/movies',
  }),
  component: MoviesPage,
})

const getImageUrl = (path: string | null | undefined, size: string = 'w500') => {
  if (!path) return '';
  let url = path;
  if (!path.startsWith('http')) {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    url = `https://image.tmdb.org/t/p/${size}${cleanPath}`;
  }
  return url.replace(/([^:]\/)\/+/g, "$1");
}

function MoviesPage() {
  const { t, i18n: i18nInstance } = useTranslation()
  const { data, isLoading, refetch, isRefetching } = useRandomMovie()
  const movie = data?.success ? data.data.result : null

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(i18nInstance.language === 'uk' ? 'uk-UA' : 'ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  }

  return (
    <div className="page-shell relative">
      {movie?.backdrop_path && (
        <div 
          className="absolute -top-10 left-1/2 -translate-x-1/2 w-[120%] h-[600px] -z-10 bg-cover bg-center opacity-[0.08] blur-3xl pointer-events-none rounded-[4rem] transition-all duration-700" 
          style={{ backgroundImage: `url(${getImageUrl(movie.backdrop_path, 'original')})` }} 
        />
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Film className="page-title-icon" /> {t('movies.title')}
          </h1>
          <p className="page-subtitle">{t('movies.subtitle')}</p>
        </div>
        <button 
          onClick={() => refetch()}
          disabled={isRefetching}
          className="page-action active:scale-[0.98]"
        >
          <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
          {isRefetching ? t('movies.loading') : t('movies.next')}
        </button>
      </div>

      {isLoading && !movie ? (
        <div className="content-card p-6 md:p-8 flex flex-col md:flex-row gap-8 animate-pulse">
           <div className="w-full md:w-[280px] h-[400px] bg-secondary/50 rounded-xl shrink-0" />
           <div className="flex-1 space-y-4">
              <div className="h-8 bg-secondary/50 rounded w-3/4" />
              <div className="h-4 bg-secondary/50 rounded w-1/4" />
              <div className="h-24 bg-secondary/50 rounded w-full" />
           </div>
        </div>
      ) : movie && (
        <div className={`content-card p-6 md:p-8 flex flex-col md:flex-row gap-8 transition-all duration-500 ${isRefetching ? 'opacity-50 scale-[0.99]' : 'opacity-100 scale-100'}`}>
          {movie.poster_path ? (
            <div className="w-full md:w-[280px] shrink-0 rounded-xl overflow-hidden shadow-lg border border-border bg-muted/20">
              <img 
                src={getImageUrl(movie.poster_path, 'w500')} 
                alt={movie.title} 
                className="w-full h-auto object-cover hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
            </div>
          ) : (
            <div className="w-full md:w-[280px] h-[400px] shrink-0 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground border border-border">
              <Film className="w-12 h-12 opacity-40" />
            </div>
          )}

          <div className="flex-1 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                  {movie.title}
                </h2>
                {movie.original_title && movie.original_title !== movie.title && (
                  <p className="text-sm font-medium text-muted-foreground mt-1">
                    {movie.original_title}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {movie.vote_average > 0 && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20 text-sm font-semibold">
                    <Star className="w-4 h-4 fill-amber-500" />
                    {movie.vote_average.toFixed(1)}
                    {movie.vote_count > 0 && (
                      <span className="text-xs text-amber-500/70 font-normal">
                        ({movie.vote_count})
                      </span>
                    )}
                  </div>
                )}

                {movie.release_date && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-secondary text-muted-foreground border border-border text-sm font-medium">
                    <Calendar className="w-4 h-4" />
                    {formatDate(movie.release_date)}
                  </div>
                )}

                {movie.popularity > 0 && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-orange-500/10 text-orange-500 border border-orange-500/20 text-sm font-medium">
                    <Flame className="w-4 h-4" />
                    {Math.round(movie.popularity)} pts
                  </div>
                )}
              </div>

              {movie.overview && (
                <div className="space-y-2 pt-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('movies.overview', 'Опис')}
                  </h3>
                  <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
                    {movie.overview}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
