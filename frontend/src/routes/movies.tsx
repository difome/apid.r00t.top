import { createFileRoute } from '@tanstack/react-router'
import { Film, Star, Calendar, RefreshCw, Flame, Users } from "lucide-react"
import { useRandomMovie } from '@/hooks/use-movies'
import { useTranslation } from 'react-i18next'
import { useEffect } from 'react'

export const Route = createFileRoute('/movies')({
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
  const { t, i18n } = useTranslation()
  const lang = i18n.language || 'ru'
  const { data, isLoading, refetch, isRefetching } = useRandomMovie(lang)
  const movie = data?.success ? data.data.result : null

  useEffect(() => {
    document.title = `${t('nav.movies')} | Apid`;
  }, [t]);

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('ru-RU', {
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
      {/* Элемент фонового эмбиент-размытия на основе бэкдропа фильма */}
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
          {isRefetching ? t('movies.rolling') : t('movies.roll')}
        </button>
      </div>

      {isLoading && !movie ? (
        <div className="h-[500px] content-card animate-pulse" />
      ) : movie && (
        <div className={`content-card overflow-hidden flex flex-col md:flex-row transition-all duration-500 ${isRefetching ? 'opacity-50 scale-[0.99]' : 'opacity-100 scale-100'}`}>
          
          {/* Левая колонка: Постер */}
          <div className="w-full md:w-1/3 bg-secondary relative overflow-hidden group min-h-[450px] md:min-h-0 flex items-center justify-center">
             {movie.poster_path ? (
                <img 
                  src={getImageUrl(movie.poster_path, 'w500')} 
                  alt={movie.title || movie.original_title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
             ) : (
                <div className="w-full h-full min-h-[400px] flex items-center justify-center p-10 bg-secondary/20">
                   <Film className="w-32 h-32 text-primary/10 animate-pulse" />
                </div>
             )}
             <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent md:hidden" />
          </div>

          {/* Правая колонка: Детали и метаданные */}
          <div className="p-6 md:p-8 flex-1 flex flex-col justify-between">
            <div className="space-y-6">
              
              {/* Полоска с бейджами/оценками */}
              <div className="flex flex-wrap items-center gap-2">
                 {/* Звездный рейтинг с количеством проголосовавших */}
                  <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-500 px-3 py-1.5 rounded-lg border border-amber-500/20 font-semibold text-sm">
                    <Star className="w-4 h-4 fill-amber-400" />
                    <span>{movie.vote_average?.toFixed(1) || '0.0'}</span>
                    <span className="text-[10px] text-amber-400/60 font-bold">({movie.vote_count?.toLocaleString() || '0'})</span>
                 </div>

                 {/* Популярность (Пламя) */}
                 {movie.popularity && (
                    <div className="flex items-center gap-1.5 bg-rose-500/10 text-rose-500 px-3 py-1.5 rounded-lg border border-rose-500/20 font-semibold text-sm">
                      <Flame className="w-4 h-4 fill-rose-400" />
                      <span>{movie.popularity?.toFixed(0)}</span>
                   </div>
                 )}
              </div>

              {/* Название фильма и Оригинальное название */}
              <div>
                 <h2 className="text-3xl md:text-4xl font-semibold mb-2 tracking-tight leading-tight text-foreground">{movie.title || movie.name}</h2>
                 {movie.original_title && movie.original_title !== movie.title && (
                  <p className="text-sm md:text-base text-muted-foreground font-medium opacity-85">
                    {movie.original_title}
                  </p>
                )}
              </div>

              {/* Дата релиза и Жанры */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-muted-foreground font-bold text-sm">
                   <Calendar className="w-4 h-4 text-primary" /> 
                   <span>{t('movies.released')} {formatDate(movie.release_date)}</span>
                </div>

                {/* Жанры из API */}
                {movie.genres && movie.genres.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {movie.genres.map((name: string) => (
                      <span 
                        key={name} 
                        className="bg-secondary text-muted-foreground px-3 py-1 rounded-lg text-xs font-medium border border-border"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Синопсис/Описание */}
              <div className="space-y-2">
                <p className="text-base leading-relaxed text-muted-foreground border-l-2 border-border pl-4 py-1">
                  {movie.description || movie.overview}
                </p>
              </div>
            </div>

            {/* Актерский состав */}
            {movie.cast && movie.cast.length > 0 && (
              <div className="mt-8 pt-6 border-t border-border space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground/80">
                  <Users className="w-4 h-4 text-primary" /> Актерский состав
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {movie.cast.slice(0, 5).map((actor: any) => (
                    <div 
                      key={actor.id} 
                      className="flex flex-col items-center text-center p-2.5 rounded-xl bg-secondary/40 border border-border hover:bg-secondary transition-colors"
                    >
                      <div className="w-12 h-12 rounded-full overflow-hidden mb-2 border border-border">
                        {actor.profile_path ? (
                          <img 
                            src={getImageUrl(actor.profile_path, 'w185')} 
                            alt={actor.name} 
                            className="w-full h-full object-cover object-top"
                          />
                        ) : (
                          <div className="w-full h-full bg-secondary/50 flex items-center justify-center">
                            <span className="text-xs text-muted-foreground font-semibold">{actor.name[0]}</span>
                          </div>
                        )}
                      </div>
                      <span className="text-xs font-extrabold text-foreground line-clamp-1 leading-tight">{actor.name}</span>
                      <span className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5 leading-tight">{actor.character}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  )
}
