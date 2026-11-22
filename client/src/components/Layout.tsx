import { Link, useLocation } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../lib/auth'
import { useSubHeader } from '../lib/subheader'
import { APP_VERSION } from '../version'
import { api } from '../lib/api'
import { Menu, MenuItem } from './Menu'
import { Avatar } from './Avatar'

const CalendarIcon = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.75} className="w-5 h-5">
    <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 2v4M16 2v4M3 10h18" />
  </svg>
)

const GamepadIcon = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.75} className="w-5 h-5">
    <rect x="2" y="6" width="20" height="12" rx="3" strokeLinecap="round" strokeLinejoin="round" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12h4M8 10v4M15 11h.01M17 13h.01" />
  </svg>
)

const BagIcon = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.75} className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
  </svg>
)

const AdminIcon = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.75} className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
  </svg>
)

const FaqIcon = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.75} className="w-5 h-5">
    <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" />
  </svg>
)

const TrophyIcon = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.75} className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22M18 2H6v7a6 6 0 1012 0V2z" />
  </svg>
)

const ChartIcon = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.75} className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 16v-4M12 16V8M17 16v-7" />
  </svg>
)

// mobile: false = desktop header only (Statistiky shares the Žebříček slot on mobile via StatsTabs)
const navItems: { path: string; label: string; Icon: (p: { active: boolean }) => React.ReactElement; mobile?: boolean }[] = [
  { path: '/', label: 'Párty', Icon: CalendarIcon },
  { path: '/games', label: 'Hry', Icon: GamepadIcon },
  { path: '/packing', label: 'Balení', Icon: BagIcon },
  { path: '/leaderboard', label: 'Žebříček', Icon: TrophyIcon },
  { path: '/stats', label: 'Statistiky', Icon: ChartIcon, mobile: false },
  { path: '/faq', label: 'FAQ', Icon: FaqIcon },
]

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, isAdmin } = useAuth()
  const { subHeader } = useSubHeader()
  const location = useLocation()
  const [pendingCount, setPendingCount] = useState(0)

  const refreshPendingCount = useCallback(() => {
    if (!isAdmin) return
    api.pendingUsers().then(users => setPendingCount(users.length)).catch(() => {})
  }, [isAdmin])

  useEffect(() => {
    refreshPendingCount()
  }, [refreshPendingCount])

  useEffect(() => {
    const handler = () => refreshPendingCount()
    window.addEventListener('pending-users-changed', handler)
    return () => window.removeEventListener('pending-users-changed', handler)
  }, [refreshPendingCount])

  const allNavItems: typeof navItems = isAdmin ? [...navItems, { path: '/admin', label: 'Admin', Icon: AdminIcon }] : navItems

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' || location.pathname.startsWith('/party/') : location.pathname.startsWith(path)
  const isActiveMobile = (path: string) =>
    isActive(path) || (path === '/leaderboard' && location.pathname.startsWith('/stats'))

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top header */}
      <header className="bg-chrome/95 backdrop-blur-md border-b border-black/40 shadow-lg shadow-black/20 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6 self-stretch">
            <Link to="/" className="text-lg font-extrabold text-white uppercase tracking-[0.12em]">
              LAN <span className="text-indigo-400">Party</span>
            </Link>
            {/* Desktop nav */}
            <nav className="hidden sm:flex items-stretch gap-1 self-stretch">
              {allNavItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative flex items-center px-3 border-b-2 text-[13px] font-semibold uppercase tracking-wider transition-colors ${
                    isActive(item.path)
                      ? 'border-indigo-400 text-indigo-400'
                      : 'border-transparent text-zinc-300 hover:text-white'
                  }`}
                >
                  {item.label}
                  {item.path === '/admin' && pendingCount > 0 && (
                    <span className="ml-1.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                      {pendingCount}
                    </span>
                  )}
                </Link>
              ))}
            </nav>
          </div>

          {user && (
            <Menu label="Účet" buttonClassName="flex items-center gap-2 rounded-lg pl-1 pr-2 py-1 text-sm text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
              trigger={<>
                <Avatar id={user.id} name={user.displayName} className="w-7 h-7 text-[11px]" ring="ring-1 ring-black/40" />
                <span className="hidden sm:inline">{user.displayName}</span>
                <span className="text-[10px] text-zinc-500">▾</span>
              </>}>
              <MenuItem to="/password">Změnit heslo</MenuItem>
              <MenuItem onClick={logout}>Odhlásit</MenuItem>
            </Menu>
          )}
        </div>
        {subHeader && (
          <div className="border-t border-white/5">
            <div className="max-w-6xl mx-auto px-4">
              {subHeader}
            </div>
          </div>
        )}
      </header>

      {/* Main content — extra bottom padding on mobile for the nav bar */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 pb-24 sm:pb-8">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-chrome/95 backdrop-blur-md border-t border-black/40">
        <div className="flex items-center justify-around px-2 py-1 safe-area-pb">
          {allNavItems.filter(item => item.mobile !== false).map(item => {
            const active = isActiveMobile(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-bottom-item flex-1 ${
                  active ? 'text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <span className="relative inline-flex">
                  <item.Icon active={active} />
                  {item.path === '/admin' && pendingCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 px-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                      {pendingCount}
                    </span>
                  )}
                </span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      <footer className="hidden sm:block bg-chrome border-t border-black/40 py-3 text-center text-xs text-zinc-600">
        Made by Zodiak • {APP_VERSION}
      </footer>
    </div>
  )
}
