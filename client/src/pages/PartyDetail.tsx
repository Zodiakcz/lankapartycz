import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import qrCode from '../img/qr_code.jpg'

const TIME_SLOTS = [
  { value: 'morning', label: 'Dopoledne' },
  { value: 'afternoon', label: 'Odpoledne' },
  { value: 'evening', label: 'Večer' },
  { value: 'night', label: 'Noc' },
]

const SOURCE_LABELS: Record<string, string> = {
  steam: 'Steam',
  epic: 'Epic Games',
  copied: 'Kopie',
  free: 'Free',
  other: 'Jiné',
}

export function PartyDetail() {
  const { id } = useParams()
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()
  const partyId = Number(id)

  const [party, setParty] = useState<any>(null)
  const [allGames, setAllGames] = useState<any[]>([])
  const [split, setSplit] = useState<any>(null)
  const [tab, setTab] = useState<'info' | 'schedule' | 'expenses' | 'shopping' | 'packing'>('info')

  // Attendance form
  const [attForm, setAttForm] = useState({ status: 'maybe', arrival: '', departure: '', advance: '0' })

  // Expense form
  const [expForm, setExpForm] = useState({ amount: '', description: '', paidByUserId: '' })

  // Admin edit/add attendance
  const [editAttId, setEditAttId] = useState<number | null>(null)
  const [editAttForm, setEditAttForm] = useState({ status: 'maybe', arrival: '', departure: '', advance: '0' })
  const [addingAtt, setAddingAtt] = useState(false)
  const [addAttForm, setAddAttForm] = useState({ userId: '', status: 'maybe', arrival: '', departure: '', advance: '0' })
  const [allUsers, setAllUsers] = useState<any[]>([])

  const startEditAtt = (a: any) => {
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
    const updated = await api.adminEditAttendance(partyId, editAttId, editAttForm)
    setParty((prev: any) => ({
      ...prev,
      attendance: prev.attendance.map((a: any) => a.userId === editAttId ? { ...a, ...updated } : a),
    }))
    setEditAttId(null)
  }

  const saveAddAtt = async () => {
    if (!addAttForm.userId) return
    await api.adminEditAttendance(partyId, Number(addAttForm.userId), addAttForm)
    setAddingAtt(false)
    setAddAttForm({ userId: '', status: 'maybe', arrival: '', departure: '', advance: '0' })
    load()
  }

  // Schedule form
  const [schedForm, setSchedForm] = useState({ day: 1, timeSlot: 'afternoon', title: '', description: '' })

  // Spotify edit
  const [spotifyEdit, setSpotifyEdit] = useState(false)
  const [spotifyInfo, setSpotifyInfo] = useState('')

  useEffect(() => { load(); if (isAdmin) api.users().then(setAllUsers) }, [partyId])

  const load = async () => {
    const [p, games] = await Promise.all([api.party(partyId), api.games()])
    setParty(p)
    setAllGames(games)
    setSpotifyInfo(p.spotifyInfo || '')

    const myAtt = p.attendance?.find((a: any) => a.userId === user?.id)
    if (myAtt) {
      setAttForm({
        status: myAtt.status,
        arrival: myAtt.arrival ? myAtt.arrival.slice(0, 16) : '',
        departure: myAtt.departure ? myAtt.departure.slice(0, 16) : '',
        advance: String(myAtt.advance || 0),
      })
    }
  }

  const loadSplit = () => api.getExpenseSplit(partyId).then(setSplit)

  const handleAttendance = async (e: React.FormEvent) => {
    e.preventDefault()
    await api.setAttendance(partyId, attForm)
    load()
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

  const handleSaveSpotify = async () => {
    await api.updateParty(partyId, { spotifyInfo })
    setSpotifyEdit(false)
    load()
  }

  const handleDelete = async () => {
    if (confirm('Opravdu smazat tuto párty?')) {
      await api.deleteParty(partyId)
      navigate('/')
    }
  }

  if (!party) return <div className="text-gray-500">Načítání...</div>

  const formatDate = (d: string) => new Date(d).toLocaleDateString('cs-CZ')
  const formatDateTime = (d: string) => new Date(d).toLocaleString('cs-CZ', { timeZone: 'UTC' })

  const partyDays = Math.ceil((new Date(party.endDate).getTime() - new Date(party.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
  const partyGameIds = new Set(party.partyGames?.map((pg: any) => pg.gameId))
  const availableGames = allGames.filter(g => !partyGameIds.has(g.id))

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <button onClick={() => navigate('/')} className="text-sm text-gray-500 hover:text-gray-300 mb-2">&larr; Zpět</button>
          <h1 className="text-2xl font-bold text-blue-400">{party.name}</h1>
          <p className="text-gray-400">{party.location}</p>
          <p className="text-sm text-gray-500">{formatDate(party.startDate)} – {formatDate(party.endDate)} ({partyDays} dní)</p>
          {party.description && <p className="text-gray-400 mt-2">{party.description}</p>}
        </div>
        {isAdmin && (
          <button onClick={handleDelete} className="text-red-500 hover:text-red-400 text-sm">Smazat</button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-700 overflow-x-auto">
        {(['info', 'schedule', 'expenses', 'shopping', 'packing'] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); if (t === 'expenses') loadSplit() }}
            className={`px-3 sm:px-4 py-2 text-sm whitespace-nowrap ${tab === t ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-200'}`}>
            {{ info: 'Účast & Hry', schedule: 'Program', expenses: 'Finance', shopping: 'Nákupy', packing: 'Balení & Spotify' }[t]}
          </button>
        ))}
      </div>

      {/* Info Tab */}
      {tab === 'info' && (
        <div className="space-y-6">
          {/* Attendance */}
          <section>
            <h2 className="text-lg font-semibold mb-3">Moje účast</h2>
            <form onSubmit={handleAttendance} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-wrap gap-3 items-end">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Status</label>
                  <select value={attForm.status} onChange={e => setAttForm({ ...attForm, status: e.target.value })}
                    className="bg-gray-700 rounded px-3 py-2 text-white w-full">
                    <option value="confirmed">Potvrzeno</option>
                    <option value="maybe">Možná</option>
                    <option value="declined">Neúčast</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Příjezd</label>
                  <input type="datetime-local" value={attForm.arrival} onChange={e => setAttForm({ ...attForm, arrival: e.target.value })}
                    className="bg-gray-700 rounded px-3 py-2 text-white w-full" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Odjezd</label>
                  <input type="datetime-local" value={attForm.departure} onChange={e => setAttForm({ ...attForm, departure: e.target.value })}
                    className="bg-gray-700 rounded px-3 py-2 text-white w-full" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Záloha (Kč)</label>
                  <input type="number" step="1" min="0" value={attForm.advance} onChange={e => setAttForm({ ...attForm, advance: e.target.value })}
                    className="bg-gray-700 rounded px-3 py-2 text-white w-full" />
                </div>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm col-span-2 sm:col-span-1">Uložit</button>
              </div>
              <div className="mt-4 flex items-start gap-4">
                <img src={qrCode} alt="QR platba" className="w-24 h-24 sm:w-32 sm:h-32 rounded border border-gray-600 flex-shrink-0" />
                <p className="text-xs text-gray-400 mt-1">Naskenuj QR kód pro zaslání zálohy. Po odeslání zadej částku výše.</p>
              </div>
            </form>
          </section>

          {/* Who's coming */}
          <section>
            <h2 className="text-lg font-semibold mb-3">Kdo jede</h2>
            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-x-auto">
              <table className="w-full text-sm min-w-[400px]">
                <thead className="bg-gray-750">
                  <tr className="text-gray-400 text-left">
                    <th className="px-3 py-2">Jméno</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 hidden sm:table-cell">Příjezd</th>
                    <th className="px-3 py-2 hidden sm:table-cell">Odjezd</th>
                    <th className="px-3 py-2">Nocí</th>
                    <th className="px-3 py-2">Záloha</th>
                    {isAdmin && <th className="px-3 py-2"></th>}
                  </tr>
                </thead>
                <tbody>
                  {party.attendance?.map((a: any) => (
                    editAttId === a.userId ? (
                      <tr key={a.id} className="border-t border-gray-700 bg-gray-750">
                        <td className="px-4 py-2 font-medium">{a.user.displayName}</td>
                        <td className="px-4 py-2">
                          <select value={editAttForm.status} onChange={e => setEditAttForm({ ...editAttForm, status: e.target.value })}
                            className="bg-gray-700 rounded px-2 py-1 text-white text-xs">
                            <option value="confirmed">Potvrzeno</option>
                            <option value="maybe">Možná</option>
                            <option value="declined">Neúčast</option>
                          </select>
                        </td>
                        <td className="px-4 py-2 hidden sm:table-cell">
                          <input type="datetime-local" value={editAttForm.arrival} onChange={e => setEditAttForm({ ...editAttForm, arrival: e.target.value })}
                            className="bg-gray-700 rounded px-2 py-1 text-white text-xs" />
                        </td>
                        <td className="px-4 py-2 hidden sm:table-cell">
                          <input type="datetime-local" value={editAttForm.departure} onChange={e => setEditAttForm({ ...editAttForm, departure: e.target.value })}
                            className="bg-gray-700 rounded px-2 py-1 text-white text-xs" />
                        </td>
                        <td className="px-4 py-2">–</td>
                        <td className="px-4 py-2">
                          <input type="number" value={editAttForm.advance} onChange={e => setEditAttForm({ ...editAttForm, advance: e.target.value })}
                            className="bg-gray-700 rounded px-2 py-1 text-white text-xs w-20" />
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex gap-2">
                            <button onClick={saveEditAtt} className="text-green-400 hover:text-green-300 text-xs">Uložit</button>
                            <button onClick={() => setEditAttId(null)} className="text-gray-400 hover:text-gray-300 text-xs">Zrušit</button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                    <tr key={a.id} className="border-t border-gray-700">
                      <td className="px-4 py-2">{a.user.displayName}</td>
                      <td className="px-4 py-2">
                        <span className={`text-xs px-2 py-1 rounded ${
                          a.status === 'confirmed' ? 'bg-green-900/50 text-green-400' :
                          a.status === 'maybe' ? 'bg-yellow-900/50 text-yellow-400' :
                          'bg-red-900/50 text-red-400'
                        }`}>
                          {a.status === 'confirmed' ? 'Potvrzeno' : a.status === 'maybe' ? 'Možná' : 'Neúčast'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-400 hidden sm:table-cell">{a.arrival ? formatDateTime(a.arrival) : '–'}</td>
                      <td className="px-4 py-2 text-gray-400 hidden sm:table-cell">{a.departure ? formatDateTime(a.departure) : '–'}</td>
                      <td className="px-4 py-2 font-medium">{a.arrival && a.departure ? (() => {
                        const arr = new Date(a.arrival); const dep = new Date(a.departure)
                        const startDay = new Date(arr.getFullYear(), arr.getMonth(), arr.getDate())
                        const endDay = new Date(dep.getFullYear(), dep.getMonth(), dep.getDate())
                        return Math.max(0, Math.round((endDay.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24)))
                      })() : '–'}</td>
                      <td className="px-4 py-2">{a.advance ? <span className="text-green-400">{a.advance} Kč</span> : '–'}</td>
                      {isAdmin && (
                        <td className="px-4 py-2">
                          <button onClick={() => startEditAtt(a)} className="text-blue-400 hover:text-blue-300 text-xs">Upravit</button>
                        </td>
                      )}
                    </tr>
                    )
                  ))}
                  {addingAtt && (
                    <tr className="border-t border-gray-700 bg-gray-750">
                      <td className="px-4 py-2">
                        <select value={addAttForm.userId} onChange={e => setAddAttForm({ ...addAttForm, userId: e.target.value })}
                          className="bg-gray-700 rounded px-2 py-1 text-white text-xs">
                          <option value="">Vyber uživatele...</option>
                          {allUsers
                            .filter(u => !party.attendance?.some((a: any) => a.userId === u.id))
                            .map((u: any) => <option key={u.id} value={u.id}>{u.displayName}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <select value={addAttForm.status} onChange={e => setAddAttForm({ ...addAttForm, status: e.target.value })}
                          className="bg-gray-700 rounded px-2 py-1 text-white text-xs">
                          <option value="confirmed">Potvrzeno</option>
                          <option value="maybe">Možná</option>
                          <option value="declined">Neúčast</option>
                        </select>
                      </td>
                      <td className="px-4 py-2 hidden sm:table-cell">
                        <input type="datetime-local" value={addAttForm.arrival} onChange={e => setAddAttForm({ ...addAttForm, arrival: e.target.value })}
                          className="bg-gray-700 rounded px-2 py-1 text-white text-xs" />
                      </td>
                      <td className="px-4 py-2 hidden sm:table-cell">
                        <input type="datetime-local" value={addAttForm.departure} onChange={e => setAddAttForm({ ...addAttForm, departure: e.target.value })}
                          className="bg-gray-700 rounded px-2 py-1 text-white text-xs" />
                      </td>
                      <td className="px-4 py-2">–</td>
                      <td className="px-4 py-2">
                        <input type="number" value={addAttForm.advance} onChange={e => setAddAttForm({ ...addAttForm, advance: e.target.value })}
                          className="bg-gray-700 rounded px-2 py-1 text-white text-xs w-20" />
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-2">
                          <button onClick={saveAddAtt} className="text-green-400 hover:text-green-300 text-xs">Uložit</button>
                          <button onClick={() => setAddingAtt(false)} className="text-gray-400 hover:text-gray-300 text-xs">Zrušit</button>
                        </div>
                      </td>
                    </tr>
                  )}
                  {(!party.attendance || party.attendance.length === 0) && !addingAtt && (
                    <tr><td colSpan={isAdmin ? 7 : 6} className="px-4 py-4 text-gray-500 text-center">Nikdo se zatím nepřihlásil</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {isAdmin && !addingAtt && (
              <button onClick={() => { setAddingAtt(true); setEditAttId(null) }}
                className="mt-3 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm">
                + Přidat účastníka
              </button>
            )}
          </section>

          {/* Games */}
          <section>
            <h2 className="text-lg font-semibold mb-3">Hry na této párty</h2>
            <div className="space-y-2">
              {party.partyGames?.map((pg: any) => (
                <div key={pg.id} className="bg-gray-800 rounded p-3 border border-gray-700 flex items-center justify-between">
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="font-medium">{pg.game.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      pg.game.source === 'steam' ? 'bg-blue-900/50 text-blue-400' :
                      pg.game.source === 'epic' ? 'bg-orange-900/50 text-orange-400' :
                      pg.game.source === 'copied' ? 'bg-yellow-900/50 text-yellow-400' :
                      pg.game.source === 'free' ? 'bg-green-900/50 text-green-400' :
                      'bg-gray-700 text-gray-400'
                    }`}>{SOURCE_LABELS[pg.game.source] || pg.game.source}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">
                      {pg.game.maxPlayers ? `${pg.game.minPlayers}–${pg.game.maxPlayers} hráčů` : `${pg.game.minPlayers}+ hráčů`}
                    </span>
                  </div>
                  {isAdmin && (
                    <button onClick={() => handleRemoveGame(pg.gameId)} className="text-red-500 hover:text-red-400 text-sm">Odebrat</button>
                  )}
                </div>
              ))}
            </div>
            {isAdmin && availableGames.length > 0 && (
              <div className="mt-3 flex gap-2">
                <select onChange={e => { if (e.target.value) handleAddGame(Number(e.target.value)); e.target.value = '' }}
                  className="bg-gray-700 rounded px-3 py-2 text-white text-sm">
                  <option value="">+ Přidat hru...</option>
                  {availableGames.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
                <button onClick={async () => { for (const g of availableGames) await api.addGameToParty(partyId, g.id); load() }}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm">Přidat všechny</button>
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
            const dayItems = party.schedule?.filter((s: any) => s.day === day) || []

            return (
              <div key={day} className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                <h3 className="font-semibold text-blue-400 mb-3">Den {day} – {dayDate.toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
                {dayItems.length > 0 ? (
                  <div className="space-y-2">
                    {dayItems.map((item: any) => (
                      <div key={item.id} className="flex items-start justify-between bg-gray-750 rounded p-2">
                        <div>
                          <span className="text-xs text-gray-500">{TIME_SLOTS.find(t => t.value === item.timeSlot)?.label}</span>
                          <span className="ml-2 font-medium">{item.title}</span>
                          {item.description && <p className="text-sm text-gray-400 mt-1">{item.description}</p>}
                        </div>
                        {isAdmin && (
                          <button onClick={async () => { await api.deleteScheduleItem(item.id); load() }}
                            className="text-red-500 hover:text-red-400 text-xs ml-2">Smazat</button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">Zatím nic naplánováno</p>
                )}
              </div>
            )
          })}

          {isAdmin && (
            <form onSubmit={handleSchedule} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="font-semibold mb-3">Přidat do programu</h3>
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 items-end">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Den</label>
                  <select value={schedForm.day} onChange={e => setSchedForm({ ...schedForm, day: Number(e.target.value) })}
                    className="bg-gray-700 rounded px-3 py-2 text-white">
                    {Array.from({ length: partyDays }, (_, i) => <option key={i + 1} value={i + 1}>Den {i + 1}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Čas</label>
                  <select value={schedForm.timeSlot} onChange={e => setSchedForm({ ...schedForm, timeSlot: e.target.value })}
                    className="bg-gray-700 rounded px-3 py-2 text-white">
                    {TIME_SLOTS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="flex-1 min-w-0 col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Název</label>
                  <input value={schedForm.title} onChange={e => setSchedForm({ ...schedForm, title: e.target.value })} required
                    className="bg-gray-700 rounded px-3 py-2 text-white w-full" placeholder="CS2 turnaj, večeře..." />
                </div>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm">Přidat</button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Expenses Tab */}
      {tab === 'expenses' && (
        <div className="space-y-6">
          {/* Add expense */}
          <form onSubmit={handleExpense} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h3 className="font-semibold mb-3">Přidat výdaj</h3>
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 items-end">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Kdo platil</label>
                <select value={expForm.paidByUserId} onChange={e => setExpForm({ ...expForm, paidByUserId: e.target.value })} required
                  className="bg-gray-700 rounded px-3 py-2 text-white">
                  <option value="">Vyber...</option>
                  {party.attendance?.filter((a: any) => a.status === 'confirmed' || a.status === 'maybe').map((a: any) => (
                    <option key={a.userId} value={a.userId}>{a.user.displayName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Částka (Kč)</label>
                <input type="number" step="0.01" value={expForm.amount} onChange={e => setExpForm({ ...expForm, amount: e.target.value })} required
                  className="bg-gray-700 rounded px-3 py-2 text-white w-28" />
              </div>
              <div className="flex-1 min-w-0 col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Popis</label>
                <input value={expForm.description} onChange={e => setExpForm({ ...expForm, description: e.target.value })} required
                  className="bg-gray-700 rounded px-3 py-2 text-white w-full" placeholder="Nákup, elektřina..." />
              </div>
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm">Přidat</button>
            </div>
          </form>

          {/* Expense list */}
          <section>
            <h3 className="font-semibold mb-3">Výdaje</h3>
            <div className="space-y-2">
              {party.expenses?.map((e: any) => (
                <div key={e.id} className="bg-gray-800 rounded p-3 border border-gray-700 flex items-center justify-between">
                  <div>
                    <span className="font-medium">{e.description}</span>
                    <span className="text-blue-400 ml-2 font-semibold">{e.amount} Kč</span>
                    <span className="text-xs text-gray-500 ml-2">– {e.paidBy.displayName}</span>
                  </div>
                  {(isAdmin || e.paidByUserId === user?.id) && (
                    <button onClick={async () => { await api.deleteExpense(e.id); load(); loadSplit() }}
                      className="text-red-500 hover:text-red-400 text-sm">Smazat</button>
                  )}
                </div>
              ))}
              {(!party.expenses || party.expenses.length === 0) && (
                <p className="text-gray-500">Zatím žádné výdaje</p>
              )}
            </div>
          </section>

          {/* Split */}
          {split && (
            <section>
              <h3 className="font-semibold mb-3">Rozúčtování</h3>
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-400 mb-4">
                  <span>Náklady celkem: <strong className="text-white">{split.sharedTotal} Kč</strong></span>
                  <span>Zálohy celkem: <strong className="text-white">{split.totalAdvances} Kč</strong></span>
                  <span>Celkem nocí: <strong className="text-white">{split.totalNights}</strong></span>
                  {split.totalNights > 0 && <span>Cena za noc: <strong className="text-white">{Math.round(split.sharedTotal / split.totalNights)} Kč</strong></span>}
                </div>
                <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-x-auto">
                  <table className="w-full text-sm min-w-[500px]">
                    <thead>
                      <tr className="text-gray-400 text-left border-b border-gray-700">
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
                      {split.perPerson?.map((p: any) => (
                        <tr key={p.user.id} className={`border-t border-gray-700 ${p.settled ? 'opacity-60' : ''}`}>
                          <td className="px-4 py-2 font-medium">{p.user.displayName}</td>
                          <td className="px-4 py-2 text-gray-400">{p.nights}</td>
                          <td className="px-4 py-2 text-gray-400">{p.owes} Kč</td>
                          <td className="px-4 py-2 text-gray-400">{p.advance} Kč</td>
                          <td className="px-4 py-2 text-gray-400">{p.paid} Kč</td>
                          <td className={`px-4 py-2 font-semibold ${p.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
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
                              className={`w-4 h-4 accent-green-500 ${isAdmin ? 'cursor-pointer' : 'cursor-default'}`}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-500 mt-3">Bilance = záloha + nákupy − podíl. Kladná = přeplatek, záporná = doplatit.</p>
              </div>
            </section>
          )}
        </div>
      )}

      {/* Shopping Tab */}
      {tab === 'shopping' && <ShoppingTab partyId={partyId} isAdmin={isAdmin} />}

      {/* Packing & Spotify Tab */}
      {tab === 'packing' && (
        <div className="space-y-6">
          {/* Spotify */}
          <section>
            <h2 className="text-lg font-semibold mb-3">Spotify</h2>
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
              {spotifyEdit ? (
                <div className="flex gap-2">
                  <textarea value={spotifyInfo} onChange={e => setSpotifyInfo(e.target.value)}
                    className="bg-gray-700 rounded px-3 py-2 text-white flex-1" rows={3} placeholder="Přihlašovací údaje, playlist odkaz..." />
                  <div className="flex flex-col gap-2">
                    <button onClick={handleSaveSpotify} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm">Uložit</button>
                    <button onClick={() => setSpotifyEdit(false)} className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm">Zrušit</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <p className="text-gray-300 whitespace-pre-wrap">{party.spotifyInfo || 'Zatím nezadáno'}</p>
                  {isAdmin && <button onClick={() => setSpotifyEdit(true)} className="text-blue-400 hover:text-blue-300 text-sm ml-4">Upravit</button>}
                </div>
              )}
            </div>
          </section>

          {/* Packing list */}
          <section>
            <h2 className="text-lg font-semibold mb-3">Co zabalit</h2>
            <PackingList partyId={partyId} isAdmin={isAdmin} />
          </section>
        </div>
      )}
    </div>
  )
}

function ShoppingTab({ partyId, isAdmin }: { partyId: number; isAdmin: boolean }) {
  const [categories, setCategories] = useState<any[]>([])
  const [estimates, setEstimates] = useState<any[]>([])
  const [calculation, setCalculation] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [newItem, setNewItem] = useState('')

  useEffect(() => { load() }, [partyId])

  const load = async () => {
    const [cats, est, calc, itms] = await Promise.all([
      api.foodCategories(),
      api.getFoodEstimates(partyId),
      api.calculateFood(partyId),
      api.getShoppingItems(partyId),
    ])
    setCategories(cats)
    setEstimates(est)
    setCalculation(calc)
    setItems(itms)
  }

  const handleEstimateChange = async (category: string, perNight: number, unit: string) => {
    await api.setFoodEstimate(partyId, { category, perNight, unit })
    load()
  }

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItem.trim()) return
    await api.addShoppingItem(partyId, newItem.trim())
    setNewItem('')
    load()
  }

  const handleToggle = async (id: number) => {
    await api.toggleShoppingItem(partyId, id)
    load()
  }

  const handleDeleteItem = async (id: number) => {
    await api.deleteShoppingItem(partyId, id)
    load()
  }

  const getEstimate = (catKey: string) => estimates.find((e: any) => e.category === catKey)

  return (
    <div className="space-y-8">
      {/* Food calculation */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Kalkulace jídla</h2>

        {calculation && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 mb-4">
            <div className="flex gap-6 text-sm text-gray-400">
              <span>Potvrzených: <strong className="text-white">{calculation.confirmedPeople}</strong></span>
              <span>Celkem nocí: <strong className="text-white">{calculation.totalNights}</strong></span>
            </div>
            {calculation.perPerson?.length > 0 && (
              <div className="mt-2 text-xs text-gray-500">
                {calculation.perPerson.map((p: any) => (
                  <span key={p.user.id} className="mr-3">{p.user.displayName}: {p.nights} nocí</span>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-x-auto">
          <table className="w-full text-sm min-w-[400px]">
            <thead>
              <tr className="text-gray-400 text-left border-b border-gray-700">
                <th className="px-3 py-2 w-8"></th>
                <th className="px-3 py-2">Kategorie</th>
                <th className="px-3 py-2 w-24">Na os./noc</th>
                <th className="px-3 py-2 w-20">Jednotka</th>
                <th className="px-3 py-2 w-24">Koupit</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat: any) => {
                const est = getEstimate(cat.key)
                const perNight = est?.perNight || 0
                const unit = est?.unit || cat.defaultUnit
                const calcRow = calculation?.amounts?.find((a: any) => a.category === cat.key)

                return (
                  <tr key={cat.key} className={`border-t border-gray-700 ${est?.purchased ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-2">
                      <button
                        onClick={async () => {
                          if (!est) return
                          await api.toggleFoodPurchased(partyId, cat.key)
                          load()
                        }}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                          est?.purchased ? 'bg-blue-600 border-blue-600' : 'border-gray-500'
                        }`}
                      >
                        {est?.purchased && <span className="text-white text-xs">✓</span>}
                      </button>
                    </td>
                    <td className={`px-4 py-2 font-medium ${est?.purchased ? 'line-through' : ''}`}>{cat.label}</td>
                    <td className="px-4 py-2">
                      {isAdmin ? (
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={perNight}
                          onChange={e => handleEstimateChange(cat.key, Number(e.target.value), unit)}
                          className="bg-gray-700 rounded px-2 py-1 text-white w-20"
                        />
                      ) : (
                        <span>{perNight}</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {isAdmin ? (
                        <select
                          value={unit}
                          onChange={e => handleEstimateChange(cat.key, perNight, e.target.value)}
                          className="bg-gray-700 rounded px-2 py-1 text-white"
                        >
                          <option value="ks">ks</option>
                          <option value="l">l</option>
                          <option value="baleni">balení</option>
                          <option value="kg">kg</option>
                        </select>
                      ) : (
                        <span>{unit}</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <span className="font-semibold text-blue-400">
                        {calcRow ? `${calcRow.totalNeeded} ${unit}` : '–'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Shopping list */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Nákupní seznam</h2>

        <form onSubmit={handleAddItem} className="flex gap-2 mb-4">
          <input
            value={newItem}
            onChange={e => setNewItem(e.target.value)}
            placeholder="Přidat položku..."
            className="bg-gray-700 rounded px-3 py-2 text-white flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm">Přidat</button>
        </form>

        <div className="space-y-1">
          {items.map((item: any) => (
            <div key={item.id} className="flex items-center gap-3 bg-gray-800 rounded p-3 border border-gray-700">
              <button
                onClick={() => handleToggle(item.id)}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                  item.checked ? 'bg-blue-600 border-blue-600' : 'border-gray-500'
                }`}
              >
                {item.checked && <span className="text-white text-xs">✓</span>}
              </button>
              <span className={`flex-1 ${item.checked ? 'line-through text-gray-500' : ''}`}>{item.name}</span>
              <button onClick={() => handleDeleteItem(item.id)} className="text-red-500 hover:text-red-400 text-xs">Smazat</button>
            </div>
          ))}
          {items.length === 0 && <p className="text-gray-500 text-sm">Seznam je prázdný</p>}
        </div>
      </section>
    </div>
  )
}

function PackingList({ partyId, isAdmin }: { partyId: number; isAdmin: boolean }) {
  const [items, setItems] = useState<any[]>([])
  const [newItem, setNewItem] = useState({ name: '', category: 'general' })

  useEffect(() => { load() }, [partyId])
  const load = () => api.getPacking(partyId).then(setItems)

  const CATEGORIES: Record<string, string> = { hardware: 'Hardware', general: 'Obecné', food: 'Jídlo & pití', other: 'Ostatní' }

  const grouped = items.reduce((acc: Record<string, any[]>, item) => {
    const cat = item.category || 'general'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    await api.createPackingItem({ ...newItem, partyId })
    setNewItem({ name: '', category: 'general' })
    load()
  }

  return (
    <div className="space-y-4">
      {Object.entries(CATEGORIES).map(([key, label]) => (
        grouped[key]?.length ? (
          <div key={key}>
            <h4 className="text-sm font-semibold text-gray-400 mb-2">{label}</h4>
            <div className="space-y-1">
              {grouped[key].map((item: any) => (
                <div key={item.id} className="flex items-center justify-between bg-gray-800 rounded p-2 border border-gray-700">
                  <span>{item.name} {item.partyId && <span className="text-xs text-blue-400">(pro tuto párty)</span>}</span>
                  {isAdmin && item.partyId && (
                    <button onClick={async () => { await api.deletePackingItem(item.id); load() }}
                      className="text-red-500 text-xs">Smazat</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : null
      ))}
      {isAdmin && (
        <form onSubmit={handleAdd} className="flex gap-2 items-end">
          <input value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} required
            className="bg-gray-700 rounded px-3 py-2 text-white flex-1" placeholder="Nová položka..." />
          <select value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })}
            className="bg-gray-700 rounded px-3 py-2 text-white">
            {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm">Přidat</button>
        </form>
      )}
    </div>
  )
}
