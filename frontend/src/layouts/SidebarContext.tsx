import { createContext, useContext, useEffect, useState } from 'react'

interface SidebarContextValue {
  isOpen: boolean
  isCollapsed: boolean
  isMobile: boolean
  toggleOpen: () => void
  toggleCollapsed: () => void
  closeMobile: () => void
}

const SidebarContext = createContext<SidebarContextValue | null>(null)
const SIDEBAR_COLLAPSED_KEY = 'ayniflow-sidebar-collapsed'
const LEGACY_SIDEBAR_COLLAPSED_KEY = 'germanhyt-sidebar-collapsed'

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const current = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
    const legacy = localStorage.getItem(LEGACY_SIDEBAR_COLLAPSED_KEY)
    const effective = current ?? legacy
    if (!current && legacy) {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, legacy)
      localStorage.removeItem(LEGACY_SIDEBAR_COLLAPSED_KEY)
    }
    return effective === 'true'
  })
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1023px)')
    const sync = () => {
      setIsMobile(media.matches)
      if (!media.matches) {
        setIsOpen(false)
      }
    }
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(isCollapsed))
  }, [isCollapsed])

  const value: SidebarContextValue = {
    isOpen,
    isCollapsed,
    isMobile,
    toggleOpen: () => setIsOpen((prev) => !prev),
    toggleCollapsed: () => setIsCollapsed((prev) => !prev),
    closeMobile: () => setIsOpen(false),
  }

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
}

export function useSidebar() {
  const ctx = useContext(SidebarContext)
  if (!ctx) {
    throw new Error('useSidebar must be used within SidebarProvider')
  }
  return ctx
}
