import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import type { Party } from '../lib/types'
import { HeroBackdrop, useGoldArt } from '../components/HeroBackdrop'
import { AvatarStack } from '../components/Avatar'

function useCountdown(targetDate: Date | null) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    if (!targetDate) return
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [targetDate])
  if (!targetDate) return null
  const diff = targetDate.getTime() - now.getTime()
  if (diff <= 0) return null
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  const seconds = Math.floor((diff % 60000) / 1000)
  return { days, hours, minutes, seconds }
}

export function Parties() {
  const { isAdmin } = useAuth()
  const [parties, setParties] = useState<Party[]>([])
  const goldArt = useGoldArt()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', location: '', startDate: '', endDate: '', description: '', advancePerNight: '' })

  useEffect(() => { loadParties() }, [])

  const loadParties = () => api.parties().then(setParties)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    await api.createParty({ ...form, advancePerNight: Number(form.advancePerNight) || 0 })
    setForm({ name: '', location: '', startDate: '', endDate: '', description: '', advancePerNight: '' })
    setShowForm(false)
    loadParties()
  }

  const now = new Date()
  const past = parties.filter(p => new Date(p.endDate) < now)
  const future = parties
    .filter(p => new Date(p.endDate) >= now)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())

  const nextParty = future[0] || null
  const laterParties = future.slice(1)
  const countdown = useCountdown(nextParty && new Date(nextParty.startDate) > now ? new Date(nextParty.startDate) : null)

  const formatDate = (d: string) => new Date(d).toLocaleDateString('cs-CZ')

  const placeStatusBadge = (status: string) => {
    if (status === 'confirmed') return <span className="badge badge-green">Potvrzeno</span>
    if (status === 'booked') return <span className="badge badge-blue">Rezervováno</span>
    return <span className="badge badge-yellow">Nevyřízeno</span>
  }

  const PartyCard = ({ party }: { party: Party }) => {
    const confirmed = party.attendance?.filter(a => a.status === 'confirmed').length || 0
    const placeStatus = party.placeStatus || 'pending'
    return (
      <Link
        to={`/party/${party.id}`}
        className="card p-5 flex flex-col gap-3 hover:border-indigo-500/30 hover:bg-zinc-800/60 transition-all group"
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold text-white group-hover:text-indigo-300 transition-colors">
            {party.name}
          </h3>
          {placeStatusBadge(placeStatus)}
        </div>

        <div className="space-y-1">
          {party.location?.trim() && <p className="text-sm text-zinc-300 flex items-center gap-1.5">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0">
              <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 15.142 17 12.7 17 9.5a7 7 0 10-14 0c0 3.2 1.698 5.642 3.354 7.085a13.347 13.347 0 002.274 1.765 11.845 11.845 0 00.757.433c.098.05.179.09.24.12l.041.019.018.008.006.003zM10 11.25a1.75 1.75 0 100-3.5 1.75 1.75 0 000 3.5z" clipRule="evenodd" />
            </svg>
            {party.location}
          </p>}
          <p className="text-xs text-zinc-500 flex items-center gap-1.5">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 flex-shrink-0">
              <path fillRule="evenodd" d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z" clipRule="evenodd" />
            </svg>
            {formatDate(party.startDate)} – {formatDate(party.endDate)}
          </p>
        </div>

        <div className="flex items-center gap-3 pt-1 border-t border-white/6">
          <span className="text-xs text-zinc-500">
            <span className="text-zinc-300 font-medium">{confirmed}</span> potvrzených
          </span>
        </div>
      </Link>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-heading">LAN Párty</h1>
        {isAdmin && (
          <button onClick={() => setShowForm(!showForm)} className="btn-primary">
            + Nová párty
          </button>
        )}
      </div>

      {showForm && (
        <div className="card p-5 mb-6">
          <h2 className="text-sm font-semibold text-zinc-400 mb-4 uppercase tracking-wider">Nová párty</h2>
          <form onSubmit={handleCreate}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Název</label>
                <input placeholder="Letní LAN 2025" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })} required
                  className="form-input" />
              </div>
              <div>
                <label className="form-label">Místo</label>
                <input placeholder="Chata XY, Praha..." value={form.location}
                  onChange={e => setForm({ ...form, location: e.target.value })} required
                  className="form-input" />
              </div>
              <div>
                <label className="form-label">Začátek</label>
                <input type="date" value={form.startDate}
                  onChange={e => setForm({ ...form, startDate: e.target.value })} required
                  className="form-input" />
              </div>
              <div>
                <label className="form-label">Konec</label>
                <input type="date" value={form.endDate}
                  onChange={e => setForm({ ...form, endDate: e.target.value })} required
                  className="form-input" />
              </div>
              <div className="sm:col-span-2">
                <label className="form-label">Popis (volitelný)</label>
                <textarea placeholder="Poznámky k akci..." value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="form-input" rows={2} />
              </div>
              <div>
                <label className="form-label">Záloha za noc (Kč)</label>
                <input type="number" step="1" min="0" placeholder="0" value={form.advancePerNight}
                  onChange={e => setForm({ ...form, advancePerNight: e.target.value })}
                  className="form-input" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button type="submit" className="btn-primary">Vytvořit</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Zrušit</button>
            </div>
          </form>
        </div>
      )}

      {/* Spotlight: the next party as a wide banner over blurred game art */}
      {nextParty && (() => {
        const going = (nextParty.attendance ?? []).filter(a => a.status === 'confirmed').map(a => a.user)
        const running = new Date(nextParty.startDate) <= now
        return (
          <Link to={`/party/${nextParty.id}`}
            className="group relative block overflow-hidden rounded-xl ring-1 ring-white/5 shadow-lg shadow-black/40 mb-8 hover:ring-indigo-400/50 transition">
            <HeroBackdrop images={goldArt} seed={nextParty.id} />
            <div className="relative p-5 sm:p-8 flex flex-col md:flex-row md:items-end gap-6">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-400">
                    {running ? 'Právě probíhá' : 'Další párty'}
                  </span>
                  {placeStatusBadge(nextParty.placeStatus || 'pending')}
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight drop-shadow-lg group-hover:text-indigo-100 transition-colors">
                  {nextParty.name}
                </h2>
                <p className="mt-1 text-zinc-300">
                  {nextParty.location && <>{nextParty.location} · </>}{formatDate(nextParty.startDate)} – {formatDate(nextParty.endDate)}
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <AvatarStack users={going} max={8} />
                  <span className="text-sm text-zinc-400">
                    {going.length > 0 ? <><span className="font-semibold text-[#a4d007]">{going.length}</span> jede</> : 'Zatím nikdo nepotvrdil'}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-start md:items-end gap-4">
                {countdown && (
                  <div className="flex gap-2">
                    {[
                      { value: countdown.days, label: 'dní' },
                      { value: countdown.hours, label: 'hod' },
                      { value: countdown.minutes, label: 'min' },
                      { value: countdown.seconds, label: 'sec' },
                    ].map(({ value, label }) => (
                      <div key={label} className="w-14 sm:w-16 rounded-lg bg-black/45 backdrop-blur-sm ring-1 ring-white/10 py-2 text-center">
                        <div className="text-2xl sm:text-3xl font-bold text-white tabular-nums leading-none">{String(value).padStart(2, '0')}</div>
                        <div className="text-[10px] text-zinc-400 uppercase tracking-wider mt-1">{label}</div>
                      </div>
                    ))}
                  </div>
                )}
                <span className="btn-primary">Otevřít párty</span>
              </div>
            </div>
          </Link>
        )
      })()}

      {laterParties.length > 0 && (
        <section className="mb-8">
          <h2 className="section-heading">Plánované</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {laterParties.map(p => <PartyCard key={p.id} party={p} />)}
          </div>
        </section>
      )}

      {/* History: one compact row per party */}
      {past.length > 0 && (
        <section>
          <h2 className="section-heading">Historie</h2>
          <div className="card divide-y divide-white/5 overflow-hidden">
            {past.map(p => {
              const confirmed = p.attendance?.filter(a => a.status === 'confirmed').length || 0
              return (
                <Link key={p.id} to={`/party/${p.id}`}
                  className="group flex flex-wrap sm:flex-nowrap items-center gap-x-4 gap-y-0.5 px-4 py-2.5 hover:bg-zinc-800/60 transition-colors">
                  <span className="font-semibold text-zinc-100 group-hover:text-indigo-300 transition-colors sm:w-40 shrink-0">{p.name}</span>
                  <span className="text-sm text-zinc-500 tabular-nums sm:w-48 shrink-0">{formatDate(p.startDate)} – {formatDate(p.endDate)}</span>
                  <span className="text-sm text-zinc-400 truncate flex-1 min-w-0">{p.location}</span>
                  <span className="text-xs text-zinc-500 whitespace-nowrap ml-auto"><span className="font-medium text-zinc-300">{confirmed}</span> lidí</span>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {parties.length === 0 && (
        <div className="text-center mt-16 text-zinc-600">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-12 h-12 mx-auto mb-3 opacity-40">
            <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 2v4M16 2v4M3 10h18" />
          </svg>
          <p className="text-sm">Zatím žádné párty.{isAdmin ? ' Vytvoř první!' : ''}</p>
        </div>
      )}
    </div>
  )
}
