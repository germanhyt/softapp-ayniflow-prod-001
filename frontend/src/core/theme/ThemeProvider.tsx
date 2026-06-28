import { createContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

export const ThemeContext = createContext<{
  theme: Theme
  toggleTheme: () => void
}>({
  theme: 'dark',
  toggleTheme: () => {},
})

const THEME_KEY = 'ayniflow-theme'
const LEGACY_THEME_KEY = 'germanhyt-theme'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const current = localStorage.getItem(THEME_KEY) as Theme | null
    const legacy = localStorage.getItem(LEGACY_THEME_KEY) as Theme | null
    const effective = current ?? legacy
    if (!current && legacy) {
      localStorage.setItem(THEME_KEY, legacy)
      localStorage.removeItem(LEGACY_THEME_KEY)
    }
    return effective || 'dark'
  })

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>
}
