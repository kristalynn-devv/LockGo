import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useLayoutEffect } from 'react'
import {
  Navigate,
  Outlet,
  RouterProvider,
  createBrowserRouter,
  useLocation,
} from 'react-router-dom'
import { useIsAdmin } from './lib/admin'
import { AdminFlashProvider } from './lib/adminFlash'
import { AuthProvider, useAuth } from './lib/auth'
import { RealtimeBridge } from './lib/realtime'
import { ThemeProvider } from './lib/theme'
import { AuthCallbackPage } from './pages/AuthCallbackPage'
import { ConfirmPage } from './pages/ConfirmPage'
import { DetailPage } from './pages/DetailPage'
import { FindPage } from './pages/FindPage'
import { HistoryPage } from './pages/HistoryPage'
import { LoginPage } from './pages/LoginPage'
import { PayPage } from './pages/PayPage'
import { ReservePage } from './pages/ReservePage'
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage'
import { AdminPaymentsPage } from './pages/admin/AdminPaymentsPage'
import { AdminReservationsPage } from './pages/admin/AdminReservationsPage'
import { AdminStationDetailPage } from './pages/admin/AdminStationDetailPage'
import { AdminStationsPage } from './pages/admin/AdminStationsPage'
import { AdminUsersPage } from './pages/admin/AdminUsersPage'
import { AdminHeader } from './ui/AdminHeader'
import { Header, TabBar } from './ui/Header'
import { IconSprite } from './ui/icons'
import { FooterDock, FooterSlotProvider, Page } from './ui/Page'
import { SkeletonList } from './ui/states'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: 1,
    },
  },
})

function ScrollToTop() {
  const { pathname } = useLocation()
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function ProtectedLayout() {
  const { session, loading } = useAuth()
  const { isAdmin, loading: adminLoading } = useIsAdmin()

  if (loading || adminLoading) {
    return (
      <Page wide>
        <SkeletonList count={4} />
      </Page>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (isAdmin) {
    return <Navigate to="/admin" replace />
  }

  return (
    <FooterSlotProvider>
      <ScrollToTop />
      <div className="flex min-h-svh min-w-0 flex-col">
        <Header />
        <Outlet />
        <FooterDock>
          <TabBar />
        </FooterDock>
      </div>
    </FooterSlotProvider>
  )
}

function AdminLayout() {
  const { session, loading } = useAuth()
  const { isAdmin, loading: adminLoading } = useIsAdmin()

  if (loading || adminLoading) {
    return (
      <Page wide>
        <SkeletonList count={4} />
      </Page>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  return (
    <FooterSlotProvider>
      <ScrollToTop />
      <AdminFlashProvider>
        <div className="flex min-h-svh min-w-0 flex-col">
          <AdminHeader />
          <Outlet />
        </div>
      </AdminFlashProvider>
    </FooterSlotProvider>
  )
}

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/auth/callback', element: <AuthCallbackPage /> },
  {
    element: <ProtectedLayout />,
    children: [
      { path: '/', element: <FindPage /> },
      { path: '/lockers/:id', element: <DetailPage /> },
      { path: '/lockers/:id/reserve', element: <ReservePage /> },
      { path: '/reservations/:id/pay', element: <PayPage /> },
      { path: '/reservations/:id', element: <ConfirmPage /> },
      { path: '/history', element: <HistoryPage /> },
    ],
  },
  {
    element: <AdminLayout />,
    children: [
      { path: '/admin', element: <AdminDashboardPage /> },
      { path: '/admin/stations', element: <AdminStationsPage /> },
      { path: '/admin/stations/:id', element: <AdminStationDetailPage /> },
      { path: '/admin/reservations', element: <AdminReservationsPage /> },
      { path: '/admin/payments', element: <AdminPaymentsPage /> },
      { path: '/admin/users', element: <AdminUsersPage /> },
    ],
  },
])

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <IconSprite />
          <RealtimeBridge />
          <RouterProvider router={router} />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
