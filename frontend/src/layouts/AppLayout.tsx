import { Outlet } from 'react-router-dom'

import { AppSidebar } from './AppSidebar'
import { AppTopbar } from './AppTopbar'
import { SidebarProvider, useSidebar } from './SidebarContext'

function AppLayoutContent() {
  const { isCollapsed, isMobile } = useSidebar()

  return (
    <div className="admin-layout app-shell">
      <AppSidebar />
      <div
        className={`admin-main${!isMobile && isCollapsed ? ' admin-main-collapsed' : ''}`}
      >
        <AppTopbar />
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export function AppLayout() {
  return (
    <SidebarProvider>
      <AppLayoutContent />
    </SidebarProvider>
  )
}
