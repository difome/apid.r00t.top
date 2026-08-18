import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import ruTranslation from './locales/ru.json'
import ukTranslation from './locales/uk.json'

export type Language = 'ru' | 'uk'

export const LANGUAGE_COOKIE = 'apid_lang'

export function normalizeLanguage(value: string | null | undefined): Language | null {
  if (!value) return null
  const clean = value.toLowerCase().trim()
  if (clean.startsWith('ru')) return 'ru'
  if (clean.startsWith('uk') || clean.startsWith('ua')) return 'uk'
  return null
}

export function parseAcceptLanguage(header: string | null | undefined): Language {
  if (!header) return 'uk'

  // Header format: e.g. "ru-RU,ru;q=0.9,uk;q=0.8,en-US;q=0.6,en;q=0.4"
  const preferences = header
    .split(',')
    .map((part) => {
      const [lang, qPart] = part.trim().split(';q=')
      const q = qPart ? parseFloat(qPart) : 1.0
      return { lang: lang.toLowerCase(), q }
    })
    .sort((a, b) => b.q - a.q)

  for (const pref of preferences) {
    const matched = normalizeLanguage(pref.lang)
    if (matched) return matched
  }

  return 'uk'
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null

  return (
    document.cookie
      .split('; ')
      .find((row) => row.startsWith(`${name}=`))
      ?.split('=')[1] || null
  )
}

export function setLanguageCookie(lang: Language) {
  if (typeof document === 'undefined') return

  document.cookie = `${LANGUAGE_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`
}

export interface ResolveLanguageParams {
  queryHl?: string | null
  cookieLang?: string | null
  acceptLanguage?: string | null
}

export function resolveLanguage(params?: ResolveLanguageParams): Language {
  // 1. Explicit ?hl= query parameter (highest priority)
  const fromQuery = normalizeLanguage(params?.queryHl)
  if (fromQuery) {
    if (typeof window !== 'undefined') {
      setLanguageCookie(fromQuery)
    }
    return fromQuery
  }

  // 2. Cookie preference
  const fromCookie = normalizeLanguage(params?.cookieLang)
  if (fromCookie) return fromCookie

  // 3. Accept-Language header (server) or navigator (client)
  if (params?.acceptLanguage) {
    return parseAcceptLanguage(params.acceptLanguage)
  }

  if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
    // Client navigator language check
    const navLangs = navigator.languages || [navigator.language]
    for (const l of navLangs) {
      const match = normalizeLanguage(l)
      if (match) return match
    }
  }

  // 4. Default fallback
  return 'uk'
}

export function detectClientLanguage(): Language {
  if (typeof window === 'undefined') return 'uk'

  const queryHl = new URLSearchParams(window.location.search).get('hl')
  const cookieLang = getCookie(LANGUAGE_COOKIE)

  return resolveLanguage({
    queryHl,
    cookieLang,
  })
}

const resources = {
  ru: {
    translation: ruTranslation,
  },
  uk: {
    translation: ukTranslation,
  },
}

i18n.use(initReactI18next).init({
  resources,
  lng: detectClientLanguage(),
  fallbackLng: 'uk',
  supportedLngs: ['uk', 'ru'],
  nonExplicitSupportedLngs: true,
  debug: false,
  interpolation: {
    escapeValue: false,
  },
})

export function initI18n(lang?: Language) {
  const target = lang || 'uk'
  if (i18n.language !== target) {
    i18n.changeLanguage(target)
  }
  return i18n
}

export default i18n
