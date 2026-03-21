import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'

export function Parties() {
  const { isAdmin } = useAuth()
  const [parties, setParties] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', location: '', startDate: '', endDate: '', description: '' })

  useEffect(() => { loadParties() }, [])

  const loadParties = () => api.parties().then(setParties)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    await api.createParty(form)
    setForm({ name: '', location: '', startDate: '', endDate: '', description: '' })
    setShowForm(false)
    loadParties()
  }

  const now = new Date()
  const upcoming = parties.filter(p => new Date(p.endDate) >= now)
  const past = parties.filter(p => new Date(p.endDate) < now)

  const formatDate = (d: string) => new Date(d).toLocaleDateString('cs-CZ')

  const PartyCard = ({ party }: { party: any }) => {
    const confirmed = party.attendance?.filter((a: any) => a.status === 'confirmed').length || 0
    return (
      <Link to={`/party/${party.id}`} className="block bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors border border-gray-700 hover:border-gray-600">
        <h3 className="text-lg font-semibold text-blue-400">{party.name}</h3>
        <p className="text-sm text-gray-400 mt-1">{party.location}</p>
        <p className="text-sm text-gray-500 mt-1">{formatDate(party.startDate)} – {formatDate(party.endDate)}</p>
        <div className="flex gap-4 mt-3 text-xs text-gray-500">
          <span>{confirmed} potvrzených</span>
          <span>{party._count?.partyGames || 0} her</span>
        </div>
      </Link>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">LAN Párty</h1>
        {isAdmin && (
          <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm">
            + Nová párty
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-gray-800 rounded-lg p-4 mb-6 border border-gray-700">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input placeholder="Název" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required
              className="bg-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input placeholder="Místo" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} required
              className="bg-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <div>
              <label className="block text-xs text-gray-500 mb-1">Začátek</label>
              <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} required
                className="bg-gray-700 rounded px-3 py-2 text-white w-full focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Konec</label>
              <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} required
                className="bg-gray-700 rounded px-3 py-2 text-white w-full focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <textarea placeholder="Popis (volitelný)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            className="bg-gray-700 rounded px-3 py-2 text-white w-full mt-4 focus:outline-none focus:ring-2 focus:ring-blue-500" rows={2} />
          <div className="flex gap-2 mt-4">
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm">Vytvořit</button>
            <button type="button" onClick={() => setShowForm(false)} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm">Zrušit</button>
          </div>
        </form>
      )}

      {upcoming.length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-gray-300 mb-3">Nadcházející</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {upcoming.map(p => <PartyCard key={p.id} party={p} />)}
          </div>
        </>
      )}

      {past.length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-gray-300 mb-3">Minulé</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {past.map(p => <PartyCard key={p.id} party={p} />)}
          </div>
        </>
      )}

      {parties.length === 0 && (
        <p className="text-gray-500 text-center mt-12">Zatím žádné párty. {isAdmin ? 'Vytvořte první!' : ''}</p>
      )}
    </div>
  )
}
