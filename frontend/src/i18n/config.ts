import { useEffect } from 'react'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '@/i18n/locales/en.json'
import ar from '@/i18n/locales/ar.json'

export type SupportedLanguage = 'en' | 'ar'

/** Customer and admin remember their own language choice independently — switching one never affects the other. */
export const LANGUAGE_STORAGE_KEY = 'rally-language'
export const ADMIN_LANGUAGE_STORAGE_KEY = 'rally-admin-language'

function isAdminRoute(): boolean {
  return typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')
}

function getStoredLanguage(storageKey: string): SupportedLanguage {
  if (typeof window === 'undefined') return 'en'
  return window.localStorage.getItem(storageKey) === 'ar' ? 'ar' : 'en'
}

/** Whichever side of the app a hard page load lands on, that side's own stored preference applies immediately. */
const initialLanguage: SupportedLanguage = getStoredLanguage(isAdminRoute() ? ADMIN_LANGUAGE_STORAGE_KEY : LANGUAGE_STORAGE_KEY)

export function applyDocumentDirection(language: string): void {
  const isArabic = language === 'ar'
  document.documentElement.dir = isArabic ? 'rtl' : 'ltr'
  document.documentElement.lang = isArabic ? 'ar' : 'en'
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar },
  },
  lng: initialLanguage,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

// Applied synchronously at import time (before React's first paint) so
// there is never a flash of the wrong direction on load.
applyDocumentDirection(initialLanguage)

i18n.on('languageChanged', applyDocumentDirection)

/** Persists the customer site's choice and switches every t()-driven string instantly, no reload. */
export function setLanguage(language: SupportedLanguage): void {
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  void i18n.changeLanguage(language)
}

/** Persists the admin panel's choice, independently of whatever the customer site has stored. */
export function setAdminLanguage(language: SupportedLanguage): void {
  window.localStorage.setItem(ADMIN_LANGUAGE_STORAGE_KEY, language)
  void i18n.changeLanguage(language)
}

/**
 * i18next holds one shared `language` value, but customer and admin each
 * have their own remembered preference — so whichever side is mounted has
 * to re-assert its own stored choice, in case the *other* side's toggle is
 * what last changed the shared value during this session (e.g. an admin
 * who logged out, switched the customer site to Arabic, then logged back
 * in via a client-side navigation rather than a full reload).
 */
function useSyncStoredLanguage(storageKey: string): void {
  useEffect(() => {
    const stored = getStoredLanguage(storageKey)
    if (i18n.language !== stored) {
      void i18n.changeLanguage(stored)
    } else {
      // language unchanged, but direction/lang attributes still need to
      // reflect this side on every mount (see the CDP-verified case above).
      applyDocumentDirection(stored)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

export function useSyncAdminLanguage(): void {
  useSyncStoredLanguage(ADMIN_LANGUAGE_STORAGE_KEY)
}

export function useSyncCustomerLanguage(): void {
  useSyncStoredLanguage(LANGUAGE_STORAGE_KEY)
}

export default i18n
