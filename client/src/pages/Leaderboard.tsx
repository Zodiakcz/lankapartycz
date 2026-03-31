import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import type { LeaderboardEntry } from '../lib/types'

interface Achievement {
  id: string
  label: string
  color: string
  check: (entry: LeaderboardEntry, ctx: AchievementContext) => boolean
}

interface AchievementContext {
  totalParties: number
  allStats: LeaderboardEntry[]
}

const achievements: Achievement[] = [
  {
    id: 'zelezny-muz',
    label: '🏆 Železný muž',
    color: 'badge-yellow',
    check: (e, ctx) => ctx.totalParties > 0 && e.eventsAttended === ctx.totalParties,
  },
  {
    id: 'veteran',
    label: '⭐ Veterán',
    color: 'badge-purple',
    check: (e) => e.eventsAttended >= 5,
  },
  {
    id: 'nocni-valecnik',
    label: '🌙 Noční válečník',
    color: 'badge-blue',
    check: (e) => e.totalNights >= 20,
  },
  {
    id: 'sponzor',
    label: '💰 Sponzor',
    color: 'badge-green',
    check: (e) => e.totalSpent >= 2000,
  },
  {
    id: 'velky-sponzor',
    label: '💎 Velkosponzor',
    color: 'badge-orange',
    check: (e) => e.totalSpent >= 5000,
  },
  {
    id: 'nakupovac',
    label: '🛒 Nakupovač',
    color: 'badge-green',
    check: (e) => e.eventsSupplied >= 3,
  },
  {
    id: 'top-spender',
    label: '🔥 Top utráceč',
    color: 'badge-red',
    check: (e, ctx) => ctx.allStats.length > 1 && e.totalSpent === Math.max(...ctx.allStats.map(s => s.totalSpent)) && e.totalSpent > 0,
  },
  {
    id: 'top-nocovac',
    label: '😴 Přenocovač #1',
    color: 'badge-blue',
    check: (e, ctx) => ctx.allStats.length > 1 && e.totalNights === Math.max(...ctx.allStats.map(s => s.totalNights)) && e.totalNights > 0,
  },
  {
    id: 'novacek',
    label: '🐣 Nováček',
    color: 'badge-gray',
    check: (e) => e.eventsAttended === 1,
  },
]

function getAchievements(entry: LeaderboardEntry, ctx: AchievementContext) {
  return achievements.filter(a => a.check(entry, ctx))
}

function getMedal(rank: number) {
  if (rank === 0) return '🥇'
  if (rank === 1) return '🥈'
  if (rank === 2) return '🥉'
  return `${rank + 1}.`
}

export function Leaderboard() {
  const [stats, setStats] = useState<LeaderboardEntry[]>([])
  const [totalParties, setTotalParties] = useState(0)
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'events' | 'nights' | 'spent' | 'supplied'>('events')

  useEffect(() => {
    api.leaderboard().then(data => {
      setStats(data.stats)
      setTotalParties(data.totalParties)
    }).finally(() => setLoading(false))
  }, [])

  const sorted = [...stats].sort((a, b) => {
    switch (sortBy) {
      case 'nights': return b.totalNights - a.totalNights || b.eventsAttended - a.eventsAttended
      case 'spent': return b.totalSpent - a.totalSpent || b.eventsAttended - a.eventsAttended
      case 'supplied': return b.eventsSupplied - a.eventsSupplied || b.totalSpent - a.totalSpent
      default: return b.eventsAttended - a.eventsAttended || b.totalNights - a.totalNights
    }
  })

  const ctx: AchievementContext = { totalParties, allStats: stats }

  if (loading) {
    return <div className="text-center text-zinc-500 py-12">Načítání...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-heading">Žebříček</h1>
        <p className="text-sm text-zinc-400 mt-1">Statistiky ze všech {totalParties} akcí</p>
      </div>

      {/* Sort tabs */}
      <div className="tab-bar">
        {([
          ['events', 'Účasti'],
          ['nights', 'Noci'],
          ['spent', 'Utraceno'],
          ['supplied', 'Nákupy'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSortBy(key)}
            className={`tab-item ${sortBy === key ? 'tab-active' : 'tab-inactive'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Leaderboard cards */}
      <div className="space-y-3">
        {sorted.map((entry, i) => {
          const earned = getAchievements(entry, ctx)
          return (
            <div key={entry.user.id} className="card p-4">
              <div className="flex items-start gap-3">
                <span className="text-xl font-bold text-zinc-500 w-8 text-center shrink-0 pt-0.5">
                  {getMedal(i)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-zinc-100">{entry.user.displayName}</span>
                    {earned.map(a => (
                      <span key={a.id} className={`badge ${a.color}`}>{a.label}</span>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 mt-2 text-sm">
                    <div>
                      <span className="text-zinc-500">Účasti: </span>
                      <span className={`font-medium ${sortBy === 'events' ? 'text-indigo-400' : 'text-zinc-300'}`}>
                        {entry.eventsAttended}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Nocí: </span>
                      <span className={`font-medium ${sortBy === 'nights' ? 'text-indigo-400' : 'text-zinc-300'}`}>
                        {entry.totalNights}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Utraceno: </span>
                      <span className={`font-medium ${sortBy === 'spent' ? 'text-indigo-400' : 'text-zinc-300'}`}>
                        {entry.totalSpent.toLocaleString('cs-CZ')} Kč
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Nákupy: </span>
                      <span className={`font-medium ${sortBy === 'supplied' ? 'text-indigo-400' : 'text-zinc-300'}`}>
                        {entry.eventsSupplied}× nakoupil
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Achievement legend */}
      <div className="card p-4">
        <h2 className="section-heading">Achievementy</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          {achievements.map(a => (
            <div key={a.id} className="flex items-center gap-2">
              <span className={`badge ${a.color}`}>{a.label}</span>
              <span className="text-zinc-500">
                {a.id === 'zelezny-muz' && '— byl na každé akci'}
                {a.id === 'veteran' && '— 5+ účastí'}
                {a.id === 'nocni-valecnik' && '— 20+ nocí celkem'}
                {a.id === 'sponzor' && '— utratil 2 000+ Kč'}
                {a.id === 'velky-sponzor' && '— utratil 5 000+ Kč'}
                {a.id === 'nakupovac' && '— nakupoval na 3+ akcích'}
                {a.id === 'top-spender' && '— nejvíc utratil celkem'}
                {a.id === 'top-nocovac' && '— nejvíc nocí celkem'}
                {a.id === 'novacek' && '— první akce'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
