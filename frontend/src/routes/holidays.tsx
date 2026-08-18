import { createFileRoute } from '@tanstack/react-router'
import { Calendar as CalendarIcon, Tag, History, Cake, Star, ShieldAlert } from 'lucide-react'
import { useHolidays, holidaysQueryOptions } from '@/features/holidays'
import { useTranslation } from 'react-i18next'
import { createSeoHead } from '@/lib/seo'
import i18n from '@/i18n'

export const Route = createFileRoute('/holidays')({
  loader: ({ context }) => {
    return context.queryClient.ensureQueryData(holidaysQueryOptions())
  },
  head: () =>
    createSeoHead({
      title: i18n.t('nav.holidays'),
      description: i18n.t('holidays.subtitle'),
      path: '/holidays',
    }),
  component: HolidaysPage,
})

function getText(item: unknown): string {
  if (!item) return ''
  if (typeof item === 'string') return item
  if (typeof item === 'object' && 'text' in item) {
    const textVal = (item as { text?: unknown }).text
    return typeof textVal === 'string' ? textVal : ''
  }
  return ''
}

function HolidaysPage() {
  const { t } = useTranslation()
  const { data, isLoading, isRefetching } = useHolidays()

  const isSuccess = data?.status === 'success' || (data && Array.isArray(data.holidays))
  const holidays = data?.holidays ?? []
  const historicalEvents = data?.historical_events ?? []
  const birthdays = data?.birthdays ?? []
  const signs = data?.signs ?? []
  const prohibitions = data?.prohibitions ?? []

  const formattedDate = data?.date_formatted || ''
  const shortDate = formattedDate ? formattedDate.split(' ').slice(0, 2).join(' ').toLowerCase() : ''

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <CalendarIcon className="page-title-icon" /> {t('holidays.titlePrefix')} {formattedDate}
          </h1>
          <p className="page-subtitle">{t('holidays.subtitle')}</p>
        </div>
      </div>

      <div className={`transition-all duration-500 ${isRefetching ? 'opacity-50 grayscale' : 'opacity-100 grayscale-0'}`}>
        {isLoading ? (
          <div className="flex flex-col lg:grid lg:grid-cols-3 gap-8 w-full max-w-6xl mx-auto">
            <div className="lg:col-span-2 space-y-8">
              {[1, 2].map((i) => (
                <div key={i} className="h-64 content-card animate-pulse" />
              ))}
            </div>
            <div className="lg:col-span-1 space-y-8">
              {[1, 2].map((i) => (
                <div key={i} className="h-64 content-card animate-pulse" />
              ))}
            </div>
          </div>
        ) : !isSuccess ? (
          <div className="content-card p-10 md:p-14 text-center space-y-4">
            <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto opacity-70">
              <CalendarIcon className="w-12 h-12" />
            </div>
            <h3 className="text-xl font-bold text-foreground">{t('holidays.noHolidaysTitle')}</h3>
            <p className="text-muted-foreground max-w-md mx-auto">{t('holidays.noHolidaysDesc')}</p>
          </div>
        ) : (
          <div className="flex flex-col lg:grid lg:grid-cols-3 gap-8 w-full max-w-6xl mx-auto">
            {/* Left Big Column */}
            <div className="lg:col-span-2 space-y-8">
              {/* Holidays Section */}
              <div className="content-card p-6 md:p-8 space-y-6">
                <div className="flex items-center gap-3 border-b border-border pb-4">
                  <Tag className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-bold tracking-tight text-foreground">
                    {t('holidays.allHolidays', { date: shortDate })}
                  </h2>
                </div>

                <div className="grid gap-3">
                  {holidays.map((h, i) => {
                    const title = h.title || h.name || ''
                    return (
                      <div
                        key={i}
                        className="p-4 rounded-xl border border-border/80 bg-background/50 hover:bg-secondary/30 transition-colors flex items-start gap-3.5 group"
                      >
                        <div className="w-2 h-2 rounded-full bg-primary mt-2 group-hover:scale-125 transition-transform" />
                        <div className="flex-1 space-y-1">
                          <span className="font-semibold text-foreground text-base tracking-tight block">
                            {title}
                          </span>
                          {h.description && (
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {h.description}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Historical Events */}
              {historicalEvents.length > 0 && (
                <div className="content-card p-6 md:p-8 space-y-6">
                  <div className="flex items-center gap-3 border-b border-border pb-4">
                    <History className="w-5 h-5 text-indigo-500" />
                    <h2 className="text-xl font-bold tracking-tight text-foreground">{t('holidays.history')}</h2>
                  </div>

                  <div className="relative border-l-2 border-border/60 ml-3 pl-5 space-y-6">
                    {historicalEvents.map((e, i) => (
                      <div key={i} className="relative group">
                        <div className="absolute -left-[27px] top-1.5 w-3 h-3 rounded-full border-2 border-background bg-indigo-500 group-hover:scale-125 transition-transform" />
                        <div className="space-y-1">
                          <span className="font-mono text-sm font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 inline-block mb-1">
                            {e.year}
                          </span>
                          <p className="text-sm text-foreground/90 leading-relaxed">{e.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column */}
            <div className="lg:col-span-1 space-y-8">
              {/* Signs */}
              {signs.length > 0 && (
                <div className="content-card p-6 space-y-4">
                  <div className="flex items-center gap-2.5 border-b border-border pb-3">
                    <Star className="w-4 h-4 text-amber-500" />
                    <h3 className="font-bold text-foreground text-sm tracking-tight uppercase">
                      {t('holidays.signs', { date: shortDate })}
                    </h3>
                  </div>
                  <ul className="space-y-2.5">
                    {signs.map((s, i) => {
                      const text = getText(s)
                      if (!text) return null
                      return (
                        <li key={i} className="text-xs text-muted-foreground leading-relaxed flex items-start gap-2">
                          <span className="text-amber-500 font-bold">•</span>
                          <span>{text}</span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}

              {/* Prohibitions */}
              {prohibitions.length > 0 && (
                <div className="content-card p-6 space-y-4">
                  <div className="flex items-center gap-2.5 border-b border-border pb-3">
                    <ShieldAlert className="w-4 h-4 text-rose-500" />
                    <h3 className="font-bold text-foreground text-sm tracking-tight uppercase">
                      {t('holidays.prohibitions', { date: shortDate })}
                    </h3>
                  </div>
                  <ul className="space-y-2.5">
                    {prohibitions.map((p, i) => {
                      const text = getText(p)
                      if (!text) return null
                      return (
                        <li key={i} className="text-xs text-muted-foreground leading-relaxed flex items-start gap-2">
                          <span className="text-rose-500 font-bold">•</span>
                          <span>{text}</span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}

              {/* Birthdays */}
              {birthdays.length > 0 && (
                <div className="content-card p-6 space-y-4">
                  <div className="flex items-center gap-2.5 border-b border-border pb-3">
                    <Cake className="w-4 h-4 text-emerald-500" />
                    <h3 className="font-bold text-foreground text-sm tracking-tight uppercase">{t('holidays.birthdays')}</h3>
                  </div>
                  <div className="space-y-3">
                    {birthdays.map((b, i) => {
                      const name = b.name || b.description || ''
                      const desc = b.name && b.description ? b.description : undefined
                      return (
                        <div key={i} className="text-xs space-y-0.5">
                          <div className="flex items-baseline justify-between">
                            <span className="font-semibold text-foreground">{name}</span>
                            <span className="text-[10px] font-mono text-muted-foreground">{b.year}</span>
                          </div>
                          {desc && <p className="text-muted-foreground text-[11px]">{desc}</p>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
