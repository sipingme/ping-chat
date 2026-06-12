import { useEffect, useState } from 'react'
import { getLocale, t, type Locale } from './index'

export function useTranslation(): { t: (key: string) => string; locale: Locale } {
  const [locale, setLocaleState] = useState<Locale>(getLocale())

  useEffect(() => {
    const handler = () => setLocaleState(getLocale())
    window.addEventListener('locale-change', handler)
    return () => window.removeEventListener('locale-change', handler)
  }, [])

  return { t, locale }
}
