import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { LanguageProvider } from '@/hooks/use-language'
import { useTranslation } from 'react-i18next'
import { ThemeProvider } from '@/components/theme-provider'
import { ThemeToggle } from '@/components/theme-toggle'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import type { QueryClient } from '@tanstack/react-query'

import '../globals.css'

export interface RouterContext {
  queryClient: QueryClient
  lang?: string
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Apid - Фінансові дані, курси валют, котирування та медіа' },
      { name: 'description', content: 'Сервіс даних API: курси валют, метали, сировина, фільми, меми, факти, свята.' },
    ],
  }),
  component: RootComponent,
})

function Header() {
  const { t } = useTranslation()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const navLinks = [
    { label: t('nav.currency'), to: '/currency' },
    { label: t('nav.metals', 'Metals'), to: '/metals' },
    { label: t('nav.commodities', 'Commodities'), to: '/commodities' },
    { label: t('nav.movies'), to: '/movies' },
    { label: t('nav.memes'), to: '/memes' },
    { label: t('nav.facts'), to: '/facts' },
    { label: t('nav.holidays'), to: '/holidays' },
    { label: t('nav.docs', 'API Docs'), to: '/docs' },
  ]

  return (
    <header className="fixed inset-x-0 top-0 z-50 w-full border-b border-border/70 bg-background/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 h-17 flex items-center justify-between gap-4">
        <Link to="/" onClick={() => setIsMenuOpen(false)} className="text-2xl md:text-3xl font-semibold tracking-[-0.035em] text-muted-foreground hover:text-foreground transition-colors shrink-0">
          apid
        </Link>

        <div className="hidden lg:flex items-center gap-3 justify-end flex-1 min-w-0">
          <nav className="flex items-center gap-1.5 justify-end">
            {navLinks.map((link) => (
              <Link 
                key={link.to} 
                to={link.to}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors [&.active]:bg-secondary [&.active]:text-foreground whitespace-nowrap"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <ThemeToggle />
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setIsMenuOpen((value) => !value)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-secondary"
            aria-label="Toggle navigation menu"
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div className="lg:hidden border-t border-border bg-background/98 px-4 py-3 shadow-xl">
          <nav className="mx-auto grid max-w-6xl gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center justify-between rounded-xl px-4 py-3 text-base font-semibold text-foreground transition-colors hover:bg-secondary [&.active]:bg-secondary"
              >
                {link.label}
                <span className="text-muted-foreground">/</span>
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  )
}

function Footer() {
  const { t } = useTranslation()
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-border/60 mt-20 py-10 w-full">
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-[1.3fr_1fr_1fr] gap-8">
        <div className="space-y-4">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors w-fit block">
            <span className="text-lg font-medium tracking-tight">apid</span>
          </Link>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {t('footer.description', 'Сервис для предоставления API (курсы валют, праздники, фильмы, мемы, факты).')}
          </p>
        </div>

        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-foreground">{t('footer.links', 'Навигация')}</h4>
          <ul className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
            <li>
              <Link to="/currency" className="hover:text-primary transition-colors">{t('nav.currency')}</Link>
            </li>
            <li>
              <Link to="/metals" className="hover:text-primary transition-colors">{t('nav.metals', 'Metals')}</Link>
            </li>
            <li>
              <Link to="/commodities" className="hover:text-primary transition-colors">{t('nav.commodities', 'Commodities')}</Link>
            </li>
            <li>
              <Link to="/movies" className="hover:text-primary transition-colors">{t('nav.movies')}</Link>
            </li>
            <li>
              <Link to="/memes" className="hover:text-primary transition-colors">{t('nav.memes')}</Link>
            </li>
            <li>
              <Link to="/facts" className="hover:text-primary transition-colors">{t('nav.facts')}</Link>
            </li>
            <li>
              <Link to="/holidays" className="hover:text-primary transition-colors">{t('nav.holidays')}</Link>
            </li>
            <li>
              <Link to="/docs" className="hover:text-primary transition-colors font-bold">
                {t('nav.docs', 'API Docs')}
              </Link>
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-foreground">{t('footer.aboutTitle', 'О проекте')}</h4>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {t('footer.about', 'Разработано с заботой о пользователях. Все данные синхронизируются в реальном времени из проверенных и надёжных источников.')}
          </p>
          <div className="text-xs text-muted-foreground/50 font-medium">
            <Link to="/" className="hover:text-primary transition-colors">© {currentYear} Apid.</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

function RootComponent() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="apid-theme">
      <LanguageProvider>
        <div className="min-h-screen bg-background text-foreground font-sans antialiased selection:bg-primary/20 selection:text-primary flex flex-col justify-between overflow-x-hidden">
          <div className="w-full overflow-x-hidden">
            <Header />

            <main className="max-w-6xl mx-auto px-4 pt-24 pb-8 md:pt-28 md:pb-10 w-full overflow-x-hidden">
              <Outlet />
            </main>
          </div>

          <Footer />

          {import.meta.env.DEV && typeof window !== 'undefined' && <TanStackRouterDevtools />}
        </div>
      </LanguageProvider>
    </ThemeProvider>
  )
}
