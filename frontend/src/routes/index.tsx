import { createFileRoute, Link } from '@tanstack/react-router'
import { Calendar, CircleDollarSign, Film, Gem, Image, Lightbulb, Package } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { createSeoHead } from '@/lib/seo'
import i18n from '@/i18n'

export const Route = createFileRoute('/')({
  head: () => createSeoHead({
    title: `${i18n.t('home.title1')} ${i18n.t('home.title2')}`,
    description: i18n.t('home.subtitle'),
    path: '/',
  }),
  component: Index,
})

function Index() {
  const { t } = useTranslation()

  const modules = [
    { title: t('nav.currency'), description: t('home.currencyDesc'), icon: CircleDollarSign, link: '/currency' },
    { title: t('nav.metals'), description: t('home.metalsDesc'), icon: Gem, link: '/metals' },
    { title: t('nav.commodities'), description: t('home.commoditiesDesc'), icon: Package, link: '/commodities' },
    { title: t('nav.movies'), description: t('home.moviesDesc'), icon: Film, link: '/movies' },
    { title: t('nav.memes'), description: t('home.memesDesc'), icon: Image, link: '/memes' },
    { title: t('nav.holidays'), description: t('home.holidaysDesc'), icon: Calendar, link: '/holidays' },
    { title: t('nav.facts'), description: t('home.factsDesc'), icon: Lightbulb, link: '/facts' },
  ]

  return (
    <div className="py-8 md:py-12 space-y-10">
      <section className="max-w-2xl space-y-4">
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-tight">
          {t('home.title1')} {t('home.title2')}
        </h1>
        <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
          {t('home.subtitle')}.
        </p>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {modules.map((module) => {
          const Icon = module.icon

          return (
            <Link key={module.link} to={module.link} className="group block rounded-xl border border-border bg-card p-5 transition-colors hover:border-foreground/20 hover:bg-secondary/40">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="font-medium tracking-tight text-foreground">{module.title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{module.description}</p>
                  </div>
                </div>
                <span className="text-sm text-muted-foreground transition-transform group-hover:translate-x-0.5">/</span>
              </div>
              <p className="mt-5 font-mono text-xs text-muted-foreground">GET {module.link}</p>
            </Link>
          )
        })}
      </section>
    </div>
  )
}
