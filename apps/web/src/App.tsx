import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Navigate, Outlet, RouterProvider, createBrowserRouter } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import { RealtimeBridge } from './lib/realtime'
import { ThemeProvider } from './lib/theme'
import { AuthCallbackPage } from './pages/AuthCallbackPage'
import { ConfirmPage } from './pages/ConfirmPage'
import { DetailPage } from './pages/DetailPage'
import { FindPage } from './pages/FindPage'
import { HistoryPage } from './pages/HistoryPage'
import { LoginPage } from './pages/LoginPage'
import { ReservePage } from './pages/ReservePage'
import { Header, TabBar } from './ui/Header'
import { IconSprite } from './ui/icons'
import { FooterDock, Page } from './ui/Page'
import { SkeletonList } from './ui/states'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: 1,
    },
  },
})

function ProtectedLayout() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <Page wide>
        <SkeletonList count={4} />
      </Page>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="flex min-h-svh flex-col">
      <Header />
      <Outlet />
      <FooterDock>
        <TabBar />
      </FooterDock>
    </div>
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
      { path: '/reservations/:id', element: <ConfirmPage /> },
      { path: '/history', element: <HistoryPage /> },
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
