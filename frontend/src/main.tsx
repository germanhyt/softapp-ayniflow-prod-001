import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import { AppBootstrap } from './core/components/skeleton/AppBootstrap'
import { registerServiceWorker } from './core/pwa/registerServiceWorker'
import { ThemeProvider } from './core/theme/ThemeProvider'
import { FinanceSocketProvider } from './modules/finance/application/realtime/FinanceSocketProvider'
import { AppRoutes } from './routes'
import './index.css'

registerServiceWorker()

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <FinanceSocketProvider>
            <AppBootstrap>
              <AppRoutes />
            </AppBootstrap>
          </FinanceSocketProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
)
