import { createFileRoute } from '@tanstack/react-router'
import { Calendar as CalendarIcon, Tag, History, Cake, Star, ShieldAlert } from "lucide-react"
import { useHolidays } from '@/hooks/use-holidays'
import { useLanguage } from '@/hooks/use-language'
import { useTranslation } from 'react-i18next'
import { useEffect } from 'react'

export const Route = createFileRoute('/holidays')({
  component: HolidaysPage,
})

function HolidaysPage() {
  const { lang } = useLanguage()
  const { t } = useTranslation()
  const { data, isLoading, isRefetching } = useHolidays(lang)
  
  const isSuccess = data?.status === 'success'
  const holidays = isSuccess && data.holidays ? data.holidays : []
  const historicalEvents = isSuccess && data.historical_events ? data.historical_events : []
  const birthdays = isSuccess && data.birthdays ? data.birthdays : []
  const signs = isSuccess && data.signs ? data.signs : []
  const prohibitions = isSuccess && data.prohibitions ? data.prohibitions : []

  const formattedDate = isSuccess && data.date_formatted ? data.date_formatted : '...'

  useEffect(() => {
    document.title = `${t('nav.holidays')} ${formattedDate !== '...' ? `(${formattedDate})` : ''} | Apid`;
  }, [t, formattedDate]);
  const shortDate = formattedDate.split(' ').slice(0, 2).join(' ').toLowerCase()

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
               {[1,2].map(i => (
                   <div key={i} className="h-64 content-card animate-pulse" />
               ))}
             </div>
             <div className="lg:col-span-1 space-y-8">
               {[1,2].map(i => (
                   <div key={i} className="h-64 content-card animate-pulse" />
               ))}
             </div>
          </div>
        ) : !isSuccess ? (
           <div className="content-card p-10 md:p-14 text-center space-y-4">
             <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto opacity-70">
               <CalendarIcon className="w-12 h-12" />
            </div>
             <p className="text-muted-foreground font-semibold text-sm">{t('holidays.noHolidaysTitle')}</p>
            <p className="text-base text-muted-foreground/60">{t('holidays.noHolidaysDesc')}</p>
          </div>
        ) : (
          <div className="space-y-8 w-full max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Левая колонка - основная информация (Какой день, События, Именины) */}
              <div className="lg:col-span-2 space-y-8 flex flex-col">
                
                {/* Какой день */}
                {data.description && (
                   <div className="content-card overflow-hidden">
                    <div className="bg-secondary/40 px-5 py-4 border-b border-border flex items-center gap-3">
                      <div className="p-2 bg-card rounded-lg border border-border">
                        <Tag className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <h2 className="text-base font-semibold tracking-tight text-foreground">{t('holidays.today', { date: shortDate })}</h2>
                    </div>
                    <div className="p-5 space-y-4 text-muted-foreground leading-relaxed text-base">
                      {data.description.split('\n\n').map((pText: string, idx: number) => (
                        <p key={idx}>{pText}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Historical Events */}
                {historicalEvents.length > 0 && (
                  <div className="content-card overflow-hidden">
                    <div className="bg-secondary/40 px-5 py-4 border-b border-border flex items-center gap-3">
                      <div className="p-2 bg-card rounded-lg border border-border">
                        <History className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <h2 className="text-base font-semibold tracking-tight text-foreground">{t('holidays.history')}</h2>
                    </div>
                    <div className="divide-y divide-border p-2">
                      {historicalEvents.map((h: any, idx: number) => (
                        <div key={idx} className="px-6 py-4 hover:bg-blue-500/5 transition-colors group flex gap-5 rounded-xl">
                          <div className="font-semibold text-foreground text-base w-16 flex-shrink-0 pt-0.5">{h.year}</div>
                          <div className="text-muted-foreground group-hover:text-foreground transition-colors leading-snug">{h.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Birthdays */}
                {birthdays.length > 0 && (
                  <div className="content-card overflow-hidden">
                    <div className="bg-secondary/40 px-5 py-4 border-b border-border flex items-center gap-3">
                      <div className="p-2 bg-card rounded-lg border border-border">
                        <Cake className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <h2 className="text-base font-semibold tracking-tight text-foreground">{t('holidays.birthdays')}</h2>
                    </div>
                    <div className="divide-y divide-border p-2">
                      {birthdays.map((b: any, idx: number) => (
                        <div key={idx} className="px-6 py-4 hover:bg-pink-500/5 transition-colors group flex gap-5 rounded-xl">
                          <div className="font-semibold text-foreground text-base w-16 flex-shrink-0 pt-0.5">{b.year}</div>
                          <div className="text-muted-foreground group-hover:text-foreground transition-colors leading-snug">{b.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>

              {/* Правая колонка - сайдбар (Все праздники) */}
              <div className="lg:col-span-1 space-y-8 flex flex-col">

                {/* Все праздники */}
                {holidays.length > 0 && (
                  <div className="content-card overflow-hidden h-full flex flex-col">
                    <div className="bg-secondary/40 px-5 py-4 border-b border-border flex items-center gap-3">
                      <div className="p-2 bg-card rounded-lg border border-border">
                        <Tag className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <h2 className="text-base font-semibold tracking-tight text-foreground">{t('holidays.allHolidays', { date: shortDate })}</h2>
                    </div>
                    <div className="divide-y divide-border p-2 overflow-y-auto flex-1 custom-scrollbar max-h-[600px] lg:max-h-none">
                      {holidays.map((h: any, idx: number) => (
                        <div key={idx} className="px-6 py-4 hover:bg-primary/5 transition-colors group rounded-xl">
                           <div className="font-medium text-base leading-tight group-hover:text-foreground transition-colors">{h.name}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>

            </div>

            {/* Нижняя секция - приметы и запреты в два блока под низом */}
            {(signs.length > 0 || prohibitions.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
                
                {/* Signs */}
                {signs.length > 0 && (
                  <div className="content-card overflow-hidden">
                    <div className="bg-secondary/40 px-5 py-4 border-b border-border flex items-center gap-3">
                      <div className="p-2 bg-card rounded-lg border border-border">
                        <Star className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <h2 className="text-base font-semibold tracking-tight text-foreground">{t('holidays.signs', { date: shortDate })}</h2>
                    </div>
                    <div className="divide-y divide-border p-2">
                      {signs.map((s: any, idx: number) => (
                        <div key={idx} className="px-6 py-4 hover:bg-yellow-500/5 transition-colors group rounded-xl">
                          <div className="text-muted-foreground group-hover:text-foreground transition-colors leading-snug text-sm md:text-base">{s.text}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Prohibitions */}
                {prohibitions.length > 0 && (
                  <div className="content-card overflow-hidden">
                    <div className="bg-secondary/40 px-5 py-4 border-b border-border flex items-center gap-3">
                      <div className="p-2 bg-card rounded-lg border border-border">
                        <ShieldAlert className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <h2 className="text-base font-semibold tracking-tight text-foreground">{t('holidays.prohibitions', { date: shortDate })}</h2>
                    </div>
                    <div className="divide-y divide-border p-2">
                      {prohibitions.map((p: any, idx: number) => (
                        <div key={idx} className="px-6 py-4 hover:bg-red-500/5 transition-colors group rounded-xl">
                          <div className="text-muted-foreground group-hover:text-foreground transition-colors leading-snug text-sm md:text-base">{p.text}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

