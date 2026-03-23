import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { SOURCE_LABELS, TIME_SLOTS, sourceBadgeClass } from '../lib/constants'
import type { Party, User, Game, Attendance, Expense, ExpenseSplit, PartyGame, ScheduleItem } from '../lib/types'
import { ShoppingTab } from '../components/ShoppingTab'
import { PackingList } from '../components/PackingList'
import qrCode from '../img/qr_code.jpg'

export function PartyDetail() {
  const { id } = useParams()
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()
  const partyId = Number(id)

  const [party, setParty] = useState<Party | null>(null)
  const [allGames, setAllGames] = useState<Game[]>([])
  const [split, setSplit] = useState<ExpenseSplit | null>(null)
  const [tab, setTab] = useState<'info' | 'schedule' | 'expenses' | 'shopping' | 'packing'>('info')

  type AttStatus = 'confirmed' | 'maybe' | 'declined'

  // Attendance form
  const [attForm, setAttForm] = useState<{ status: AttStatus; arrival: string; departure: string; advance: string }>({ status: 'maybe', arrival: '', departure: '', advance: '0' })

  // Expense form
  const [expForm, setExpForm] = useState({ amount: '', description: '', paidByUserId: '' })

  // Admin edit/add attendance
  const [editAttId, setEditAttId] = useState<number | null>(null)
  const [editAttForm, setEditAttForm] = useState<{ status: AttStatus; arrival: string; departure: string; advance: string }>({ status: 'maybe', arrival: '', departure: '', advance: '0' })
  const [addingAtt, setAddingAtt] = useState(false)
  const [addAttForm, setAddAttForm] = useState<{ userId: string; status: AttStatus; arrival: string; departure: string; advance: string }>({ userId: '', status: 'maybe', arrival: '', departure: '', advance: '0' })
  const [allUsers, setAllUsers] = useState<User[]>([])

  const startEditAtt = (a: Attendance) => {
    setEditAttId(a.userId)
    setEditAttForm({
      status: a.status,
      arrival: a.arrival ? a.arrival.slice(0, 16) : '',
      departure: a.departure ? a.departure.slice(0, 16) : '',
      advance: String(a.advance || 0),
    })
  }

  const saveEditAtt = async () => {
    if (editAttId === null) return
    await api.adminEditAttendance(partyId, editAttId, { ...editAttForm, advance: Number(editAttForm.advance) })
    setEditAttId(null)
    load()
  }

  const saveAddAtt = async () => {
    if (!addAttForm.userId) return
    await api.adminEditAttendance(partyId, Number(addAttForm.userId), { ...addAttForm, userId: Number(addAttForm.userId), advance: Number(addAttForm.advance) })
    setAddingAtt(false)
    setAddAttForm({ userId: '', status: 'maybe', arrival: '', departure: '', advance: '0' })
    load()
  }

  // Schedule form
  const [schedForm, setSchedForm] = useState({ day: 1, timeSlot: 'afternoon', title: '', description: '' })

  // Place edit
  const [placeEdit, setPlaceEdit] = useState(false)
  const [placeAddress, setPlaceAddress] = useState('')
  const [placeStatus, setPlaceStatus] = useState('pending')

  // Notes edit
  const [notesEdit, setNotesEdit] = useState(false)
  const [notes, setNotes] = useState('')

  // Party detail edit
  const [partyEdit, setPartyEdit] = useState(false)
  const [partyEditForm, setPartyEditForm] = useState({ name: '', location: '', startDate: '', endDate: '', description: '', advancePerNight: '' })

  useEffect(() => { load(); if (isAdmin) api.users().then(setAllUsers) }, [partyId])

  const load = async () => {
    const [p, games] = await Promise.all([api.party(partyId), api.games()])
    setParty(p)
    setAllGames(games)
    setNotes(p.notes || '')
    setPlaceAddress(p.placeAddress || '')
    setPlaceStatus(p.placeStatus || 'pending')

    const myAtt = p.attendance?.find(a => a.userId === user?.id)
    if (myAtt) {
      setAttForm({
        status: myAtt.status,
        arrival: myAtt.arrival ? myAtt.arrival.slice(0, 16) : '',
        departure: myAtt.departure ? myAtt.departure.slice(0, 16) : '',
        advance: String(myAtt.advance || 0),
      })
    } else {
      const startNoon = p.startDate ? p.startDate.slice(0, 10) + 'T12:00' : ''
      const endNoon = p.endDate ? p.endDate.slice(0, 10) + 'T12:00' : ''
      setAttForm(prev => ({ ...prev, arrival: startNoon, departure: endNoon }))
    }
  }

  const loadSplit = () => api.getExpenseSplit(partyId).then(setSplit)

  const handleAttendance = async (e: React.FormEvent) => {
    e.preventDefault()
    await api.setAttendance(partyId, { ...attForm, advance: Number(attForm.advance) })
    await load()
  }

  const handleExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    await api.createExpense(partyId, { amount: Number(expForm.amount), description: expForm.description, paidByUserId: expForm.paidByUserId ? Number(expForm.paidByUserId) : undefined })
    setExpForm({ amount: '', description: '', paidByUserId: expForm.paidByUserId })
    load()
    loadSplit()
  }

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault()
    await api.createScheduleItem(partyId, schedForm)
    setSchedForm({ day: 1, timeSlot: 'afternoon', title: '', description: '' })
    load()
  }

  const handleAddGame = async (gameId: number) => {
    await api.addGameToParty(partyId, gameId)
    load()
  }

  const handleRemoveGame = async (gameId: number) => {
    await api.removeGameFromParty(partyId, gameId)
    load()
  }

  const startPartyEdit = () => {
    if (!party) return
    setPartyEditForm({
      name: party.name,
      location: party.location,
      startDate: party.startDate.slice(0, 10),
      endDate: party.endDate.slice(0, 10),
      description: party.description || '',
      advancePerNight: String(party.advancePerNight || 0),
    })
    setPartyEdit(true)
  }

  const handleSavePartyDetails = async () => {
    await api.updateParty(partyId, { ...partyEditForm, advancePerNight: Number(partyEditForm.advancePerNight) || 0 })
    setPartyEdit(false)
    load()
  }

  const handleSavePlace = async () => {
    await api.updateParty(partyId, { placeAddress, placeStatus })
    setPlaceEdit(false)
    load()
  }

  const handleSaveNotes = async () => {
    await api.updateParty(partyId, { notes })
    setNotesEdit(false)
    load()
  }

  const handleDelete = async () => {
    if (confirm('Opravdu smazat tuto párty?')) {
      await api.deleteParty(partyId)
      navigate('/')
    }
  }

  if (!party) return <div className="text-zinc-500">Načítání...</div>

  const formatDate = (d: string) => new Date(d).toLocaleDateString('cs-CZ')
  const formatDateTime = (d: string) => new Date(d).toLocaleString('cs-CZ', { timeZone: 'UTC' })

  const partyDays = Math.ceil((new Date(party.endDate).getTime() - new Date(party.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
  const partyGameIds = new Set(party.partyGames?.map(pg => pg.gameId))
  const availableGames = allGames.filter(g => !partyGameIds.has(g.id))

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <button onClick={() => navigate('/')} className="btn-ghost text-xs mb-2 -ml-3">&larr; Zpět</button>
          <h1 className="text-2xl font-bold text-white tracking-tight">{party.name}</h1>
          <p className="text-zinc-400 mt-0.5">{party.location}</p>
          <p className="text-sm text-zinc-500 mt-0.5">{formatDate(party.startDate)} – {formatDate(party.endDate)} ({partyDays} dní)</p>
          {party.description && <p className="text-zinc-400 mt-2 text-sm">{party.description}</p>}
        </div>
        {isAdmin && (
          <div className="flex gap-1 items-center">
            <button onClick={startPartyEdit} className="btn-ghost text-sm">Upravit</button>
            <button onClick={handleDelete} className="btn-danger text-sm">Smazat</button>
          </div>
        )}
      </div>

      {/* Party Edit Modal */}
      {partyEdit && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-lg">
            <h2 className="text-lg font-semibold mb-4">Upravit událost</h2>
            <div className="space-y-3">
              <div>
                <label className="form-label">Název</label>
                <input type="text" value={partyEditForm.name} onChange={e => setPartyEditForm({ ...partyEditForm, name: e.target.value })}
                  className="form-input" />
              </div>
              <div>
                <label className="form-label">Místo</label>
                <input type="text" value={partyEditForm.location} onChange={e => setPartyEditForm({ ...partyEditForm, location: e.target.value })}
                  className="form-input" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Začátek</label>
                  <input type="date" value={partyEditForm.startDate} onChange={e => setPartyEditForm({ ...partyEditForm, startDate: e.target.value })}
                    className="form-input" />
                </div>
                <div>
                  <label className="form-label">Konec</label>
                  <input type="date" value={partyEditForm.endDate} onChange={e => setPartyEditForm({ ...partyEditForm, endDate: e.target.value })}
                    className="form-input" />
                </div>
              </div>
              <div>
                <label className="form-label">Popis</label>
                <textarea value={partyEditForm.description} onChange={e => setPartyEditForm({ ...partyEditForm, description: e.target.value })}
                  rows={3} className="form-input" />
              </div>
              <div>
                <label className="form-label">Záloha za noc (Kč)</label>
                <input type="number" step="1" min="0" value={partyEditForm.advancePerNight}
                  onChange={e => setPartyEditForm({ ...partyEditForm, advancePerNight: e.target.value })}
                  className="form-input" />
              </div>
            </div>
            <div className="flex gap-3 mt-4 justify-end">
              <button onClick={() => setPartyEdit(false)} className="btn-ghost">Zrušit</button>
              <button onClick={handleSavePartyDetails} className="btn-primary">Uložit</button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tab-bar mb-6">
        {(['info', 'schedule', 'expenses', 'shopping', 'packing'] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); if (t === 'expenses') loadSplit() }}
            className={`tab-item ${tab === t ? 'tab-active' : 'tab-inactive'}`}>
            {{ info: 'Účast & Hry', schedule: 'Program', expenses: 'Finance', shopping: 'Nákupy', packing: 'Balení' }[t]}
          </button>
        ))}
      </div>

      {/* Info Tab */}
      {tab === 'info' && (
        <div className="space-y-6">
          {/* Attendance */}
          <section>
            <h2 className="section-heading">Moje účast</h2>
            <form onSubmit={handleAttendance} className="card p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-wrap gap-3 items-end">
                <div>
                  <label className="form-label">Status</label>
                  <select value={attForm.status} onChange={e => setAttForm({ ...attForm, status: e.target.value as AttStatus })}
                    className="form-input">
                    <option value="confirmed">Potvrzeno</option>
                    <option value="maybe">Možná</option>
                    <option value="declined">Neúčast</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Příjezd</label>
                  <input type="datetime-local" value={attForm.arrival} onChange={e => setAttForm({ ...attForm, arrival: e.target.value })}
                    className="form-input" />
                </div>
                <div>
                  <label className="form-label">Odjezd</label>
                  <input type="datetime-local" value={attForm.departure} onChange={e => setAttForm({ ...attForm, departure: e.target.value })}
                    className="form-input" />
                </div>
                <div>
                  <label className="form-label">Záloha (Kč)</label>
                  <input type="number" step="1" min="0" value={attForm.advance} onChange={e => setAttForm({ ...attForm, advance: e.target.value })}
                    className="form-input" />
                </div>
                <button type="submit" className="btn-primary col-span-2 sm:col-span-1">Uložit</button>
              </div>
              <div className="mt-4 flex items-start gap-4">
                <img src={qrCode} alt="QR platba" className="w-24 h-24 sm:w-32 sm:h-32 rounded border border-zinc-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-zinc-400 mt-1">Naskenuj QR kód pro zaslání zálohy. Po odeslání zadej částku výše.</p>
                  {party.advancePerNight > 0 && (() => {
                    const nights = attForm.arrival && attForm.departure
                      ? Math.max(0, Math.round((new Date(attForm.departure).getTime() - new Date(attForm.arrival).getTime()) / (1000 * 60 * 60 * 24)))
                      : 0
                    const recommended = nights * party.advancePerNight
                    return (
                      <p className="text-sm text-yellow-400 mt-2 font-medium">
                        Doporučená záloha: {recommended} Kč
                        <span className="text-xs text-zinc-500 ml-1">({nights} {nights === 1 ? 'noc' : nights >= 2 && nights <= 4 ? 'noci' : 'nocí'} × {party.advancePerNight} Kč)</span>
                      </p>
                    )
                  })()}
                </div>
              </div>
            </form>
          </section>

          {/* Who's coming */}
          <section>
            <h2 className="section-heading">Kdo jede</h2>
            <div className="card overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-zinc-800/60">
                  <tr className="text-zinc-400 text-left">
                    <th className="px-3 py-2">Jméno</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Příjezd</th>
                    <th className="px-3 py-2">Odjezd</th>
                    <th className="px-3 py-2">Nocí</th>
                    <th className="px-3 py-2">Záloha</th>
                    {isAdmin && <th className="px-3 py-2"></th>}
                  </tr>
                </thead>
                <tbody>
                  {party.attendance?.map((a: Attendance) => (
                    editAttId === a.userId ? (
                      <tr key={a.id} className="border-t border-white/8 bg-zinc-800/60">
                        <td className="px-4 py-2 font-medium">{a.user.displayName}</td>
                        <td className="px-4 py-2">
                          <select value={editAttForm.status} onChange={e => setEditAttForm({ ...editAttForm, status: e.target.value as AttStatus })}
                            className="form-select">
                            <option value="confirmed">Potvrzeno</option>
                            <option value="maybe">Možná</option>
                            <option value="declined">Neúčast</option>
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <input type="datetime-local" value={editAttForm.arrival} onChange={e => setEditAttForm({ ...editAttForm, arrival: e.target.value })}
                            className="form-input" />
                        </td>
                        <td className="px-4 py-2">
                          <input type="datetime-local" value={editAttForm.departure} onChange={e => setEditAttForm({ ...editAttForm, departure: e.target.value })}
                            className="form-input" />
                        </td>
                        <td className="px-4 py-2">–</td>
                        <td className="px-4 py-2">
                          <input type="number" value={editAttForm.advance} onChange={e => setEditAttForm({ ...editAttForm, advance: e.target.value })}
                            className="form-input w-20" />
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex gap-2">
                            <button onClick={saveEditAtt} className="text-emerald-400 hover:text-emerald-300 text-xs">Uložit</button>
                            <button onClick={() => setEditAttId(null)} className="text-zinc-400 hover:text-zinc-300 text-xs">Zrušit</button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                    <tr key={a.id} className="border-t border-white/8">
                      <td className="px-4 py-2">{a.user.displayName}</td>
                      <td className="px-4 py-2">
                        <span className={`badge ${
                          a.status === 'confirmed' ? 'badge-green' :
                          a.status === 'maybe' ? 'badge-yellow' :
                          'badge-red'
                        }`}>
                          {a.status === 'confirmed' ? 'Potvrzeno' : a.status === 'maybe' ? 'Možná' : 'Neúčast'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-zinc-400">{a.arrival ? formatDateTime(a.arrival) : '–'}</td>
                      <td className="px-4 py-2 text-zinc-400">{a.departure ? formatDateTime(a.departure) : '–'}</td>
                      <td className="px-4 py-2 font-medium">{a.arrival && a.departure ? (() => {
                        const arr = new Date(a.arrival); const dep = new Date(a.departure)
                        const startDay = new Date(arr.getFullYear(), arr.getMonth(), arr.getDate())
                        const endDay = new Date(dep.getFullYear(), dep.getMonth(), dep.getDate())
                        return Math.max(0, Math.round((endDay.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24)))
                      })() : '–'}</td>
                      <td className="px-4 py-2">{a.advance ? <span className="text-emerald-400">{a.advance} Kč</span> : '–'}</td>
                      {isAdmin && (
                        <td className="px-4 py-2">
                          <button onClick={() => startEditAtt(a)} className="text-indigo-400 hover:text-indigo-300 text-xs">Upravit</button>
                        </td>
                      )}
                    </tr>
                    )
                  ))}
                  {addingAtt && (
                    <tr className="border-t border-white/8 bg-zinc-800/60">
                      <td className="px-4 py-2">
                        <select value={addAttForm.userId} onChange={e => setAddAttForm({ ...addAttForm, userId: e.target.value })}
                          className="form-select">
                          <option value="">Vyber uživatele...</option>
                          {allUsers
                            .filter(u => !party.attendance?.some(a => a.userId === u.id))
                            .map(u => <option key={u.id} value={u.id}>{u.displayName}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <select value={addAttForm.status} onChange={e => setAddAttForm({ ...addAttForm, status: e.target.value as AttStatus })}
                          className="form-select">
                          <option value="confirmed">Potvrzeno</option>
                          <option value="maybe">Možná</option>
                          <option value="declined">Neúčast</option>
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <input type="datetime-local" value={addAttForm.arrival} onChange={e => setAddAttForm({ ...addAttForm, arrival: e.target.value })}
                          className="form-input" />
                      </td>
                      <td className="px-4 py-2">
                        <input type="datetime-local" value={addAttForm.departure} onChange={e => setAddAttForm({ ...addAttForm, departure: e.target.value })}
                          className="form-input" />
                      </td>
                      <td className="px-4 py-2">–</td>
                      <td className="px-4 py-2">
                        <input type="number" value={addAttForm.advance} onChange={e => setAddAttForm({ ...addAttForm, advance: e.target.value })}
                          className="form-input w-20" />
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-2">
                          <button onClick={saveAddAtt} className="text-emerald-400 hover:text-emerald-300 text-xs">Uložit</button>
                          <button onClick={() => setAddingAtt(false)} className="text-zinc-400 hover:text-zinc-300 text-xs">Zrušit</button>
                        </div>
                      </td>
                    </tr>
                  )}
                  {(!party.attendance || party.attendance.length === 0) && !addingAtt && (
                    <tr><td colSpan={isAdmin ? 7 : 6} className="px-4 py-4 text-zinc-500 text-center">Nikdo se zatím nepřihlásil</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {isAdmin && !addingAtt && (
              <button onClick={() => { setAddingAtt(true); setEditAttId(null) }}
                className="mt-3 btn-primary">
                + Přidat účastníka
              </button>
            )}
          </section>

          {/* Place */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Místo</h2>
              {isAdmin && !placeEdit && (
                <button onClick={() => setPlaceEdit(true)} className="text-indigo-400 hover:text-indigo-300 text-sm">Upravit</button>
              )}
            </div>
            <div className="card p-4">
              {placeEdit ? (
                <div className="space-y-3">
                  <div>
                    <label className="form-label">Adresa</label>
                    <input
                      type="text"
                      value={placeAddress}
                      onChange={e => setPlaceAddress(e.target.value)}
                      placeholder="Ulice, město, PSČ..."
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Stav rezervace</label>
                    <select
                      value={placeStatus}
                      onChange={e => setPlaceStatus(e.target.value)}
                      className="form-input"
                    >
                      <option value="pending">Čeká na rezervaci</option>
                      <option value="booked">Rezervováno</option>
                      <option value="confirmed">Potvrzeno</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSavePlace} className="btn-primary">Uložit</button>
                    <button onClick={() => { setPlaceEdit(false); setPlaceAddress(party.placeAddress || ''); setPlaceStatus(party.placeStatus || 'pending') }}
                      className="btn-secondary">Zrušit</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-zinc-300">{party.placeAddress || <span className="text-zinc-500 italic">Adresa zatím není zadána</span>}</span>
                    <span className={`badge ${
                      party.placeStatus === 'confirmed' ? 'badge-green' :
                      party.placeStatus === 'booked' ? 'badge-blue' :
                      'badge-yellow'
                    }`}>
                      {party.placeStatus === 'confirmed' ? 'Potvrzeno' : party.placeStatus === 'booked' ? 'Rezervováno' : 'Čeká na rezervaci'}
                    </span>
                  </div>
                  {party.placeAddress && (
                    <div className="rounded overflow-hidden border border-zinc-600" style={{ height: '220px' }}>
                      <iframe
                        title="Mapa místa"
                        width="100%"
                        height="220"
                        src={`https://maps.google.com/maps?q=${encodeURIComponent(party.placeAddress)}&output=embed`}
                        style={{ border: 0 }}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Games */}
          <section>
            <h2 className="section-heading">Hry na této párty</h2>
            <div className="space-y-2">
              {party.partyGames?.map((pg: PartyGame) => (
                <div key={pg.id} className="card p-3 flex items-center justify-between">
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="font-medium">{pg.game.name}</span>
                    <span className={sourceBadgeClass(pg.game.source)}>{SOURCE_LABELS[pg.game.source] || pg.game.source}</span>
                    <span className="badge badge-gray">
                      {pg.game.maxPlayers ? `${pg.game.minPlayers}–${pg.game.maxPlayers} hráčů` : `${pg.game.minPlayers}+ hráčů`}
                    </span>
                  </div>
                  {isAdmin && (
                    <button onClick={() => handleRemoveGame(pg.gameId)} className="btn-danger text-xs py-1">Odebrat</button>
                  )}
                </div>
              ))}
            </div>
            {isAdmin && availableGames.length > 0 && (
              <div className="mt-3 flex gap-2">
                <select onChange={e => { if (e.target.value) handleAddGame(Number(e.target.value)); e.target.value = '' }}
                  className="form-input">
                  <option value="">+ Přidat hru...</option>
                  {availableGames.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
                <button onClick={async () => { for (const g of availableGames) await api.addGameToParty(partyId, g.id); load() }}
                  className="btn-secondary">Přidat všechny</button>
              </div>
            )}
          </section>
        </div>
      )}

      {/* Schedule Tab */}
      {tab === 'schedule' && (
        <div className="space-y-6">
          {Array.from({ length: partyDays }, (_, i) => i + 1).map(day => {
            const dayDate = new Date(party.startDate)
            dayDate.setDate(dayDate.getDate() + day - 1)
            const dayItems = party.schedule?.filter(s => s.day === day) || []

            return (
              <div key={day} className="card p-4">
                <h3 className="font-semibold text-indigo-400 mb-3">Den {day} – {dayDate.toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
                {dayItems.length > 0 ? (
                  <div className="space-y-2">
                    {dayItems.map((item: ScheduleItem) => (
                      <div key={item.id} className="flex items-start justify-between bg-zinc-800/60 rounded p-2">
                        <div>
                          <span className="text-xs text-zinc-500">{TIME_SLOTS.find(t => t.value === item.timeSlot)?.label}</span>
                          <span className="ml-2 font-medium">{item.title}</span>
                          {item.description && <p className="text-sm text-zinc-400 mt-1">{item.description}</p>}
                        </div>
                        {isAdmin && (
                          <button onClick={async () => { await api.deleteScheduleItem(item.id); load() }}
                            className="text-red-500 hover:text-red-400 text-xs ml-2">Smazat</button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-zinc-500 text-sm">Zatím nic naplánováno</p>
                )}
              </div>
            )
          })}

          {isAdmin && (
            <form onSubmit={handleSchedule} className="card p-4">
              <h3 className="font-semibold mb-3">Přidat do programu</h3>
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 items-end">
                <div>
                  <label className="form-label">Den</label>
                  <select value={schedForm.day} onChange={e => setSchedForm({ ...schedForm, day: Number(e.target.value) })}
                    className="form-input">
                    {Array.from({ length: partyDays }, (_, i) => <option key={i + 1} value={i + 1}>Den {i + 1}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Čas</label>
                  <select value={schedForm.timeSlot} onChange={e => setSchedForm({ ...schedForm, timeSlot: e.target.value })}
                    className="form-input">
                    {TIME_SLOTS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="flex-1 min-w-0 col-span-2">
                  <label className="form-label">Název</label>
                  <input value={schedForm.title} onChange={e => setSchedForm({ ...schedForm, title: e.target.value })} required
                    className="form-input" placeholder="CS2 turnaj, večeře..." />
                </div>
                <button type="submit" className="btn-primary">Přidat</button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Expenses Tab */}
      {tab === 'expenses' && (
        <div className="space-y-6">
          {/* Add expense */}
          <form onSubmit={handleExpense} className="card p-4">
            <h3 className="font-semibold mb-3">Přidat výdaj</h3>
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 items-end">
              <div>
                <label className="form-label">Kdo platil</label>
                <select value={expForm.paidByUserId} onChange={e => setExpForm({ ...expForm, paidByUserId: e.target.value })} required
                  className="form-input">
                  <option value="">Vyber...</option>
                  {party.attendance?.filter(a => a.status === 'confirmed' || a.status === 'maybe').map((a: Attendance) => (
                    <option key={a.userId} value={a.userId}>{a.user.displayName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Částka (Kč)</label>
                <input type="number" step="0.01" value={expForm.amount} onChange={e => setExpForm({ ...expForm, amount: e.target.value })} required
                  className="form-input w-28" />
              </div>
              <div className="flex-1 min-w-0 col-span-2">
                <label className="form-label">Popis</label>
                <input value={expForm.description} onChange={e => setExpForm({ ...expForm, description: e.target.value })} required
                  className="form-input" placeholder="Nákup, elektřina..." />
              </div>
              <button type="submit" className="btn-primary">Přidat</button>
            </div>
          </form>

          {/* Expense list */}
          <section>
            <h3 className="font-semibold mb-3">Výdaje</h3>
            <div className="space-y-2">
              {party.expenses?.map((e: Expense) => (
                <div key={e.id} className="card p-3 flex items-center justify-between">
                  <div>
                    <span className="font-medium">{e.description}</span>
                    <span className="text-indigo-400 ml-2 font-semibold">{e.amount} Kč</span>
                    <span className="text-xs text-zinc-500 ml-2">– {e.paidBy.displayName}</span>
                  </div>
                  {(isAdmin || e.paidByUserId === user?.id) && (
                    <button onClick={async () => { await api.deleteExpense(e.id); load(); loadSplit() }}
                      className="text-red-500 hover:text-red-400 text-sm">Smazat</button>
                  )}
                </div>
              ))}
              {(!party.expenses || party.expenses.length === 0) && (
                <p className="text-zinc-500">Zatím žádné výdaje</p>
              )}
            </div>
          </section>

          {/* Split */}
          {split && (
            <section>
              <h3 className="font-semibold mb-3">Rozúčtování</h3>
              <div className="card p-4">
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-zinc-400 mb-4">
                  <span>Náklady celkem: <strong className="text-white">{split.sharedTotal} Kč</strong></span>
                  <span>Zálohy celkem: <strong className="text-white">{split.totalAdvances} Kč</strong></span>
                  <span>Celkem nocí: <strong className="text-white">{split.totalNights}</strong></span>
                  {split.totalNights > 0 && <span>Cena za noc: <strong className="text-white">{Math.round(split.sharedTotal / split.totalNights)} Kč</strong></span>}
                </div>
                <div className="card overflow-x-auto">
                  <table className="w-full text-sm min-w-[500px]">
                    <thead>
                      <tr className="text-zinc-400 text-left border-b border-white/8">
                        <th className="px-4 py-2">Jméno</th>
                        <th className="px-4 py-2">Nocí</th>
                        <th className="px-4 py-2">Podíl</th>
                        <th className="px-4 py-2">Záloha</th>
                        <th className="px-4 py-2">Nakoupil</th>
                        <th className="px-4 py-2">Bilance</th>
                        <th className="px-4 py-2">Vyrovnáno</th>
                      </tr>
                    </thead>
                    <tbody>
                      {split.perPerson?.map(p => (
                        <tr key={p.user.id} className={`border-t border-white/8 ${p.settled ? 'opacity-60' : ''}`}>
                          <td className="px-4 py-2 font-medium">{p.user.displayName}</td>
                          <td className="px-4 py-2 text-zinc-400">{p.nights}</td>
                          <td className="px-4 py-2 text-zinc-400">{p.owes} Kč</td>
                          <td className="px-4 py-2 text-zinc-400">{p.advance} Kč</td>
                          <td className="px-4 py-2 text-zinc-400">{p.paid} Kč</td>
                          <td className={`px-4 py-2 font-semibold ${p.balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {p.balance >= 0 ? `+${p.balance}` : p.balance} Kč
                          </td>
                          <td className="px-4 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={p.settled}
                              disabled={!isAdmin}
                              onChange={async (e) => {
                                await api.setSettled(Number(partyId), p.user.id, e.target.checked)
                                loadSplit()
                              }}
                              className={`w-4 h-4 accent-emerald-500 ${isAdmin ? 'cursor-pointer' : 'cursor-default'}`}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-zinc-500 mt-3">Bilance = záloha + nákupy − podíl. Kladná = přeplatek, záporná = doplatit.</p>
              </div>
            </section>
          )}
        </div>
      )}

      {/* Shopping Tab */}
      {tab === 'shopping' && <ShoppingTab partyId={partyId} isAdmin={isAdmin} />}

      {/* Packing & Notes Tab */}
      {tab === 'packing' && (
        <div className="space-y-6">
          {/* Packing list */}
          <section>
            <h2 className="section-heading">Co zabalit</h2>
            <PackingList partyId={partyId} isAdmin={isAdmin} />
          </section>

          {/* Notes */}
          <section>
            <h2 className="section-heading">Poznámky</h2>
            <div className="card p-4">
              {notesEdit ? (
                <div className="flex gap-2">
                  <textarea value={notes} onChange={e => setNotes(e.target.value)}
                    className="form-input flex-1 w-auto" rows={4} placeholder="WiFi heslo, Spotify přihlášení, důležité info..." />
                  <div className="flex flex-col gap-2">
                    <button onClick={handleSaveNotes} className="btn-primary">Uložit</button>
                    <button onClick={() => setNotesEdit(false)} className="btn-secondary">Zrušit</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <p className="text-zinc-300 whitespace-pre-wrap">{party.notes || 'Zatím nezadáno'}</p>
                  {isAdmin && <button onClick={() => setNotesEdit(true)} className="text-indigo-400 hover:text-indigo-300 text-sm ml-4">Upravit</button>}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

