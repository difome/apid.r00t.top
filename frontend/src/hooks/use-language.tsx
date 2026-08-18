import { createContext, useContext, useState,  useEffect } from 'react'
import type {ReactNode} from 'react';
import { useTranslation } from 'react-i18next'
import type { Language } from '@/i18n'

function normalizeLanguage(value: string | undefined): Language {
  return value?.toLowerCase().startsWith('ru') ? 'ru' : 'uk'
}

interface LanguageContextType {
  lang: Language
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation()
  const [lang, setLang] = useState<Language>(() => normalizeLanguage(i18n.resolvedLanguage || i18n.language))

  useEffect(() => {
    const handleLanguageChanged = (newLang: string) => setLang(normalizeLanguage(newLang))

    handleLanguageChanged(i18n.resolvedLanguage || i18n.language)
    i18n.on('languageChanged', handleLanguageChanged)

    return () => i18n.off('languageChanged', handleLanguageChanged)
  }, [i18n])

  return (
    <LanguageContext.Provider value={{ lang }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
