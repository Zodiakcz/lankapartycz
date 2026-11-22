import { Link, useLocation } from 'react-router-dom'

/** Mobile-only switch between Žebříček and Statistiky (they share one bottom-nav slot). */
export function StatsTabs() {
  const { pathname } = useLocation()
  const tabs = [
    { path: '/leaderboard', label: 'Žebříček' },
    { path: '/stats', label: 'Statistiky' },
  ]
  return (
    <div className="tab-bar sm:hidden -mt-2">
      {tabs.map(t => (
        <Link
          key={t.path}
          to={t.path}
          className={`tab-item flex-1 text-center ${pathname.startsWith(t.path) ? 'tab-active' : 'tab-inactive'}`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  )
}
