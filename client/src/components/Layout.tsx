import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { APP_VERSION } from '../version'

const navItems = [
  { path: '/', label: 'Párty' },
  { path: '/games', label: 'Hry' },
  { path: '/packing', label: 'Co zabalit' },
]

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, isAdmin } = useAuth()
  const location = useLocation()

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-xl font-bold text-blue-400">
              LAN Party
            </Link>
            <div className="hidden sm:flex gap-4">
              {navItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`text-sm ${location.pathname === item.path ? 'text-blue-400' : 'text-gray-300 hover:text-white'}`}
                >
                  {item.label}
                </Link>
              ))}
              {isAdmin && (
                <Link
                  to="/admin"
                  className={`text-sm ${location.pathname === '/admin' ? 'text-blue-400' : 'text-gray-300 hover:text-white'}`}
                >
                  Admin
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/password" className="text-sm text-gray-400 hover:text-white">
              {user?.displayName}
            </Link>
            <button onClick={logout} className="text-sm text-gray-400 hover:text-white">
              Odhlásit
            </button>
          </div>
        </div>
        {/* Mobile nav */}
        <div className="sm:hidden flex gap-4 px-4 pb-3">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`text-sm ${location.pathname === item.path ? 'text-blue-400' : 'text-gray-300'}`}
            >
              {item.label}
            </Link>
          ))}
          {isAdmin && (
            <Link to="/admin" className={`text-sm ${location.pathname === '/admin' ? 'text-blue-400' : 'text-gray-300'}`}>
              Admin
            </Link>
          )}
        </div>
      </nav>
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {children}
      </main>
      <footer className="bg-gray-800 border-t border-gray-700 py-3 text-center text-xs text-gray-500">
        Made by Zodiak • v{APP_VERSION}
      </footer>
    </div>
  )
}
