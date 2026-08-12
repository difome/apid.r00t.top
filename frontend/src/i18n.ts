import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ruTranslation from './locales/ru.json';
import ukTranslation from './locales/uk.json';

export type Language = 'ru' | 'uk';

export const LANGUAGE_COOKIE = 'apid_lang';

function normalizeLanguage(value: string | null | undefined): Language {
  return value?.toLowerCase().startsWith('ru') ? 'ru' : 'uk';
}

function getCookie(name: string) {
  if (typeof document === 'undefined') return null;

  return document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))
    ?.split('=')[1];
}

function setLanguageCookie(lang: Language) {
  if (typeof document === 'undefined') return;

  document.cookie = `${LANGUAGE_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`;
}

function detectLanguage(): Language {
  if (typeof window === 'undefined') return 'uk';

  const queryLang = new URLSearchParams(window.location.search).get('hl');
  if (queryLang !== null) {
    const lang = normalizeLanguage(queryLang);
    setLanguageCookie(lang);
    return lang;
  }

  const cookieLang = getCookie(LANGUAGE_COOKIE);
  if (cookieLang) return normalizeLanguage(cookieLang);

  return normalizeLanguage(window.navigator.language);
}

const resources = {
  ru: {
    translation: ruTranslation
  },
  uk: {
    translation: ukTranslation
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: detectLanguage(),
    fallbackLng: 'uk',
    supportedLngs: ['uk', 'ru'],
    nonExplicitSupportedLngs: true,
    debug: false,
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    }
  });

export default i18n;
