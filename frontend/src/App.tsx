import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { Dashboard } from './pages/Dashboard'
import { RepositoryList } from './pages/RepositoryList'
import { RepositoryDetail } from './pages/RepositoryDetail'
import { DocumentView } from './pages/DocumentView'
import { DocumentCreate } from './pages/DocumentCreate'
import { DURCreate } from './pages/DURCreate'
import { DURDetail } from './pages/DURDetail'
import { useAuth } from './hooks/useAuth'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
})

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-64">Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/repos" replace />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="repos" element={<RepositoryList />} />
            <Route path="dashboard" element={
              <ProtectedRoute><Dashboard /></ProtectedRoute>
            } />
            <Route path="repos/:slug" element={<RepositoryDetail />} />
            <Route path="repos/:slug/docs/new" element={
              <ProtectedRoute><DocumentCreate /></ProtectedRoute>
            } />
            <Route path="repos/:slug/docs/:docSlug" element={<DocumentView />} />
            <Route path="repos/:slug/docs/:docSlug/propose" element={
              <ProtectedRoute><DURCreate /></ProtectedRoute>
            } />
            <Route path="repos/:slug/durs/:durId" element={<DURDetail />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
