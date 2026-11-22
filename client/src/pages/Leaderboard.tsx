import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { RankMedal } from '../components/TierChip'
import { Avatar } from '../components/Avatar'
import { StatsTabs } from '../components/StatsTabs'
import type { LeaderboardEntry, AchievementThresholds } from '../lib/types'

const DEFAULT_THRESHOLDS: AchievementThresholds = {
  threshold_veteran: 5,
  threshold_nocni_valecnik: 20,
  threshold_sponzor: 2000,
  threshold_velky_sponzor: 5000,
  threshold_nakupovac: 3,
}

interface AchievementContext {
  totalParties: number
  allStats: LeaderboardEntry[]
  thresholds: AchievementThresholds
}

interface Achievement {
  id: string
  label: string
  color: string
  description: (t: AchievementThresholds) => string
  check: (entry: LeaderboardEntry, ctx: AchievementContext) => boolean
  thresholdKey?: keyof AchievementThresholds
}

const achievements: Achievement[] = [
  {
    id: 'zelezny-muz',
    label: '🏆 Železný muž',
    color: 'badge-yellow',
    description: () => '— byl na každé akci',
    check: (e, ctx) => ctx.totalParties > 0 && e.eventsAttended === ctx.totalParties,
  },
  {
    id: 'veteran',
    label: '⭐ Veterán',
    color: 'badge-purple',
    description: (t) => `— ${t.threshold_veteran}+ účastí`,
    thresholdKey: 'threshold_veteran',
    check: (e, ctx) => e.eventsAttended >= ctx.thresholds.threshold_veteran,
  },
  {
    id: 'nocni-valecnik',
    label: '🌙 Noční válečník',
    color: 'badge-blue',
    description: (t) => `— ${t.threshold_nocni_valecnik}+ nocí celkem`,
    thresholdKey: 'threshold_nocni_valecnik',
    check: (e, ctx) => e.totalNights >= ctx.thresholds.threshold_nocni_valecnik,
  },
  {
    id: 'sponzor',
    label: '💰 Sponzor',
    color: 'badge-green',
    description: (t) => `— utratil ${t.threshold_sponzor.toLocaleString('cs-CZ')}+ Kč`,
    thresholdKey: 'threshold_sponzor',
    check: (e, ctx) => e.totalSpent >= ctx.thresholds.threshold_sponzor,
  },
  {
    id: 'velky-sponzor',
    label: '💎 Velkosponzor',
    color: 'badge-orange',
    description: (t) => `— utratil ${t.threshold_velky_sponzor.toLocaleString('cs-CZ')}+ Kč`,
    thresholdKey: 'threshold_velky_sponzor',
    check: (e, ctx) => e.totalSpent >= ctx.thresholds.threshold_velky_sponzor,
  },
  {
    id: 'nakupovac',
    label: '🛒 Nakupovač',
    color: 'badge-green',
    description: (t) => `— nakupoval na ${t.threshold_nakupovac}+ akcích`,
    thresholdKey: 'threshold_nakupovac',
    check: (e, ctx) => e.eventsSupplied >= ctx.thresholds.threshold_nakupovac,
  },
  {
    id: 'top-spender',
    label: '🔥 Top utráceč',
    color: 'badge-red',
    description: () => '— nejvíc utratil celkem',
    check: (e, ctx) => ctx.allStats.length > 1 && e.totalSpent === Math.max(...ctx.allStats.map(s => s.totalSpent)) && e.totalSpent > 0,
  },
  {
    id: 'top-nocovac',
    label: '😴 Přenocovač #1',
    color: 'badge-blue',
    description: () => '— nejvíc nocí celkem',
    check: (e, ctx) => ctx.allStats.length > 1 && e.totalNights === Math.max(...ctx.allStats.map(s => s.totalNights)) && e.totalNights > 0,
  },
  {
    id: 'novacek',
    label: '🐣 Nováček',
    color: 'badge-gray',
    description: () => '— první akce',
    check: (e) => e.eventsAttended === 1,
  },
]

function getAchievements(entry: LeaderboardEntry, ctx: AchievementContext) {
  return achievements.filter(a => a.check(entry, ctx))
}

type SortKey = 'events' | 'nights' | 'spent' | 'supplied'

const STATS: { key: SortKey; label: string; value: (e: LeaderboardEntry) => string | number }[] = [
  { key: 'events', label: 'Účasti', value: e => e.eventsAttended },
  { key: 'nights', label: 'Noci', value: e => e.totalNights },
  { key: 'spent', label: 'Utraceno', value: e => `${e.totalSpent.toLocaleString('cs-CZ')} Kč` },
  { key: 'supplied', label: 'Nákupy', value: e => `${e.eventsSupplied}×` },
]

// Literal class names so Tailwind keeps them; gold sits in the middle on wide screens
const PODIUM_PLACE = ['sm:order-2 ring-1 ring-[#d9a930]/40', 'sm:order-1 sm:mt-6', 'sm:order-3 sm:mt-10']
const PODIUM_STRIP = ['tier-gold', 'tier-silver', 'tier-bronze']

export function Leaderboard() {
  const { isAdmin } = useAuth()
  const [stats, setStats] = useState<LeaderboardEntry[]>([])
  const [totalParties, setTotalParties] = useState(0)
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<SortKey>('events')
  const [thresholds, setThresholds] = useState<AchievementThresholds>(DEFAULT_THRESHOLDS)
  const [editingThresholds, setEditingThresholds] = useState(false)
  const [thresholdForm, setThresholdForm] = useState<AchievementThresholds>(DEFAULT_THRESHOLDS)
  const [savingThresholds, setSavingThresholds] = useState(false)

  useEffect(() => {
    Promise.all([
      api.leaderboard(),
      api.getSettings(),
    ]).then(([data, settings]) => {
      setStats(data.stats)
      setTotalParties(data.totalParties)
      setThresholds(settings)
      setThresholdForm(settings)
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

  const ctx: AchievementContext = { totalParties, allStats: stats, thresholds }

  const totalNights = stats.reduce((sum, s) => sum + s.totalNights, 0)
  const totalSpent = stats.reduce((sum, s) => sum + s.totalSpent, 0)

  const saveThresholds = async () => {
    setSavingThresholds(true)
    try {
      const updated = await api.updateSettings(thresholdForm)
      setThresholds(updated)
      setThresholdForm(updated)
      setEditingThresholds(false)
    } finally {
      setSavingThresholds(false)
    }
  }

  if (loading) {
    return <div className="text-center text-zinc-500 py-12">Načítání...</div>
  }

  return (
    <div className="space-y-6">
      <StatsTabs />
      <div>
        <h1 className="page-heading">Žebříček</h1>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-indigo-400">{totalParties}</div>
          <div className="text-xs text-zinc-500 mt-1">akcí celkem</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-indigo-400">{totalNights}</div>
          <div className="text-xs text-zinc-500 mt-1">herních nocí</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-indigo-400">{totalSpent.toLocaleString('cs-CZ')}</div>
          <div className="text-xs text-zinc-500 mt-1">Kč utraceno</div>
        </div>
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

      {/* Podium: top three, gold in the middle and raised */}
      {sorted.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
          {sorted.slice(0, 3).map((entry, i) => {
            const earned = getAchievements(entry, ctx)
            const main = STATS.find(st => st.key === sortBy)!
            return (
              <div key={entry.user.id} className={`card relative overflow-hidden p-3 sm:px-4 sm:pt-5 sm:pb-4 flex sm:flex-col items-center gap-3 sm:gap-0 sm:text-center ${PODIUM_PLACE[i]}`}>
                <div className={`absolute inset-x-0 top-0 h-1 ${PODIUM_STRIP[i]}`} />
                <div className="relative shrink-0">
                  <Avatar id={entry.user.id} name={entry.user.displayName} className="w-12 h-12 text-base sm:w-16 sm:h-16 sm:text-xl" ring="ring-2 ring-black/40" />
                  <span className="absolute -bottom-2 -right-2 scale-75 sm:scale-100 origin-bottom-right"><RankMedal rank={i} /></span>
                </div>
                <div className="flex-1 min-w-0 sm:flex-none sm:mt-3">
                  <div className="font-bold text-white truncate">{entry.user.displayName}</div>
                  {earned.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap sm:justify-center gap-1">
                      {earned.map(a => <span key={a.id} className={`badge ${a.color}`}>{a.label}</span>)}
                    </div>
                  )}
                </div>
                <div className="text-right sm:text-center sm:mt-3 shrink-0">
                  <div className="text-2xl sm:text-3xl font-extrabold text-indigo-400 tabular-nums leading-none">{main.value(entry)}</div>
                  <div className="text-[11px] uppercase tracking-wider text-zinc-500 mt-1">{main.label}</div>
                </div>
                <div className="hidden sm:grid mt-3 pt-3 border-t border-white/5 w-full grid-cols-3 gap-1 text-xs">
                  {STATS.filter(st => st.key !== sortBy).map(st => (
                    <div key={st.key}>
                      <div className="font-semibold text-zinc-200 tabular-nums">{st.value(entry)}</div>
                      <div className="text-zinc-500">{st.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Everyone else: a table; on phones only the sorted column shows */}
      {sorted.length > 3 && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-black/20 text-[11px] uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-3 py-2 text-left w-10">#</th>
                <th className="px-3 py-2 text-left">Hráč</th>
                {STATS.map(st => (
                  <th key={st.key} className={`px-3 py-2 text-right ${sortBy === st.key ? 'text-indigo-400' : 'hidden sm:table-cell'}`}>
                    <button onClick={() => setSortBy(st.key)} className="uppercase tracking-wider hover:text-zinc-200">{st.label}</button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.slice(3).map((entry, j) => {
                const earned = getAchievements(entry, ctx)
                return (
                  <tr key={entry.user.id} className="border-t border-white/5 hover:bg-white/[0.03]">
                    <td className="px-3 py-2"><RankMedal rank={j + 3} /></td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar id={entry.user.id} name={entry.user.displayName} className="w-7 h-7 text-[11px]" ring="ring-1 ring-black/40" />
                        <span className="font-medium text-zinc-100">{entry.user.displayName}</span>
                        <span className="hidden md:flex flex-wrap gap-1">
                          {earned.map(a => <span key={a.id} className={`badge ${a.color}`}>{a.label}</span>)}
                        </span>
                      </div>
                    </td>
                    {STATS.map(st => (
                      <td key={st.key} className={`px-3 py-2 text-right tabular-nums whitespace-nowrap ${sortBy === st.key ? 'font-semibold text-white' : 'text-zinc-400 hidden sm:table-cell'}`}>
                        {st.value(entry)}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Achievement legend */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-heading !mb-0">Achievementy</h2>
          {isAdmin && !editingThresholds && (
            <button onClick={() => setEditingThresholds(true)} className="btn-ghost text-xs">
              Upravit prahy
            </button>
          )}
        </div>

        {editingThresholds ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {achievements.filter(a => a.thresholdKey).map(a => (
                <div key={a.id} className="flex items-center gap-2">
                  <span className={`badge ${a.color} shrink-0`}>{a.label}</span>
                  <input
                    type="number"
                    min={1}
                    value={thresholdForm[a.thresholdKey!]}
                    onChange={e => setThresholdForm(prev => ({ ...prev, [a.thresholdKey!]: Number(e.target.value) }))}
                    className="form-input w-24 text-sm py-1"
                  />
                  <span className="text-zinc-500 text-xs">
                    {a.thresholdKey === 'threshold_sponzor' || a.thresholdKey === 'threshold_velky_sponzor' ? 'Kč' :
                     a.thresholdKey === 'threshold_nocni_valecnik' ? 'nocí' :
                     a.thresholdKey === 'threshold_nakupovac' ? 'akcí' : 'účastí'}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={saveThresholds} disabled={savingThresholds} className="btn-primary text-sm py-1 px-3">
                {savingThresholds ? 'Ukládám...' : 'Uložit'}
              </button>
              <button onClick={() => { setEditingThresholds(false); setThresholdForm(thresholds) }} className="btn-ghost text-sm py-1 px-3">
                Zrušit
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            {achievements.map(a => (
              <div key={a.id} className="flex items-center gap-2">
                <span className={`badge ${a.color}`}>{a.label}</span>
                <span className="text-zinc-500">{a.description(thresholds)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
