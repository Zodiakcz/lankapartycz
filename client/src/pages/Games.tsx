import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'

const SOURCE_OPTIONS = [
  { value: 'steam', label: 'Steam' },
  { value: 'copied', label: 'Kopie' },
  { value: 'free', label: 'Free' },
  { value: 'other', label: 'Jiné' },
]

export function Games() {
  const { isAdmin } = useAuth()
  const [games, setGames] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', source: 'steam', sourceNote: '', minPlayers: 1, maxPlayers: '' })

  useEffect(() => { load() }, [])
  const load = () => api.games().then(setGames)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    await api.createGame({
      ...form,
      maxPlayers: form.maxPlayers ? Number(form.maxPlayers) : null,
    })
    setForm({ name: '', source: 'steam', sourceNote: '', minPlayers: 1, maxPlayers: '' })
    setShowForm(false)
    load()
  }

  const handleDelete = async (id: number) => {
    if (confirm('Smazat tuto hru?')) {
      await api.deleteGame(id)
      load()
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Hry</h1>
        {isAdmin && (
          <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm">
            + Přidat hru
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-gray-800 rounded-lg p-4 mb-6 border border-gray-700">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input placeholder="Název hry" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required
              className="bg-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}
              className="bg-gray-700 rounded px-3 py-2 text-white">
              {SOURCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <input placeholder="Poznámka ke zdroji (volitelné)" value={form.sourceNote} onChange={e => setForm({ ...form, sourceNote: e.target.value })}
              className="bg-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <div className="flex gap-2">
              <input type="number" placeholder="Min hráčů" value={form.minPlayers} onChange={e => setForm({ ...form, minPlayers: Number(e.target.value) })}
                className="bg-gray-700 rounded px-3 py-2 text-white w-28" min="1" />
              <input type="number" placeholder="Max hráčů" value={form.maxPlayers} onChange={e => setForm({ ...form, maxPlayers: e.target.value })}
                className="bg-gray-700 rounded px-3 py-2 text-white w-28" min="1" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm">Přidat</button>
            <button type="button" onClick={() => setShowForm(false)} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm">Zrušit</button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {games.map(game => (
          <div key={game.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700 flex items-center justify-between">
            <div>
              <span className="font-medium">{game.name}</span>
              <span className={`text-xs ml-2 px-2 py-0.5 rounded ${
                game.source === 'steam' ? 'bg-blue-900/50 text-blue-400' :
                game.source === 'copied' ? 'bg-yellow-900/50 text-yellow-400' :
                game.source === 'free' ? 'bg-green-900/50 text-green-400' :
                'bg-gray-700 text-gray-400'
              }`}>
                {SOURCE_OPTIONS.find(o => o.value === game.source)?.label || game.source}
              </span>
              {game.sourceNote && <span className="text-xs text-gray-500 ml-2">{game.sourceNote}</span>}
              {game.maxPlayers && <span className="text-xs text-gray-500 ml-2">{game.minPlayers}–{game.maxPlayers} hráčů</span>}
              <span className="text-xs text-gray-600 ml-2">({game._count?.partyGames || 0}x na párty)</span>
            </div>
            {isAdmin && (
              <button onClick={() => handleDelete(game.id)} className="text-red-500 hover:text-red-400 text-sm">Smazat</button>
            )}
          </div>
        ))}
        {games.length === 0 && <p className="text-gray-500 text-center mt-8">Zatím žádné hry</p>}
      </div>
    </div>
  )
}
