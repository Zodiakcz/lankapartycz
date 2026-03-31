import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import { SubHeaderProvider } from './lib/subheader'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Parties } from './pages/Parties'
import { PartyDetail } from './pages/PartyDetail'
import { Games } from './pages/Games'
import { Packing } from './pages/Packing'
import { Admin } from './pages/Admin'
import { ChangePassword } from './pages/ChangePassword'
import { Faq } from './pages/Faq'
import { Leaderboard } from './pages/Leaderboard'

function AppRoutes() {
  const { user, loading, isAdmin } = useAuth()

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Načítání...</div>
  }

  if (!user) return <Login />

  return (
    <SubHeaderProvider>
    <Layout>
      <Routes>
        <Route path="/" element={<Parties />} />
        <Route path="/party/:id" element={<PartyDetail />} />
        <Route path="/games" element={<Games />} />
        <Route path="/packing" element={<Packing />} />
        <Route path="/faq" element={<Faq />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/password" element={<ChangePassword />} />
        {isAdmin && <Route path="/admin" element={<Admin />} />}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
    </SubHeaderProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
