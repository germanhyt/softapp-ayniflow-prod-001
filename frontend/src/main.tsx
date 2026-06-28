import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

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
            <AppRoutes />
          </FinanceSocketProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
)
