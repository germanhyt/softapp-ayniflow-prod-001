import { Navigate, Route, Routes } from 'react-router-dom'

import { AppLayout } from '../layouts/AppLayout'
import { AuthLayout } from '../layouts/AuthLayout'
import { isAuthenticated } from '../core/sessions/authStorage'
import { DashboardPage } from '../modules/auth/views/DashboardPage'
import { LoginPage } from '../modules/auth/views/LoginPage'
import { UsersPage } from '../modules/auth/views/UsersPage'
import { BudgetsPage } from '../modules/finance/views/BudgetsPage'
import { CashClosingPage } from '../modules/finance/views/CashClosingPage'
import { FinanceOverviewPage } from '../modules/finance/views/FinanceOverviewPage'
import { IntegrationsPage } from '../modules/finance/views/IntegrationsPage'
import { LoansPage } from '../modules/finance/views/LoansPage'
import { SavingsPage } from '../modules/finance/views/SavingsPage'
import { TransactionsPage } from '../modules/finance/views/TransactionsPage'
import { ProtectedRoute } from './ProtectedRoute'

function PublicOnly({ children }: { children: React.ReactNode }) {
  if (isAuthenticated()) {
    return <Navigate to="/dashboard" replace />
  }
  return children
}

export function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnly>
            <AuthLayout>
              <LoginPage />
            </AuthLayout>
          </PublicOnly>
        }
      />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute permission="users:read" />}>
        <Route element={<AppLayout />}>
          <Route path="/users" element={<UsersPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute permission="finance:read" />}>
        <Route element={<AppLayout />}>
          <Route path="/finance" element={<FinanceOverviewPage />} />
          <Route path="/finance/transactions" element={<TransactionsPage />} />
          <Route path="/finance/budgets" element={<BudgetsPage />} />
          <Route path="/finance/savings" element={<SavingsPage />} />
          <Route path="/finance/loans" element={<LoansPage />} />
          <Route path="/finance/cash-closing" element={<CashClosingPage />} />
          <Route path="/finance/integrations" element={<IntegrationsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
