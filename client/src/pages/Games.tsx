import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'

const SOURCE_OPTIONS = [
  { value: 'steam', label: 'Steam' },
  { value: 'epic', label: 'Epic Games' },
  { value: 'copied', label: 'Kopie' },
  { value: 'free', label: 'Free' },
  { value: 'other', label: 'Jiné' },
]

function sourceBadgeClass(source: string) {
  return source === 'steam' ? 'bg-blue-900/50 text-blue-400' :
    source === 'epic' ? 'bg-orange-900/50 text-orange-400' :
    source === 'copied' ? 'bg-yellow-900/50 text-yellow-400' :
    source === 'free' ? 'bg-green-900/50 text-green-400' :
    'bg-gray-700 text-gray-400'
}

function playerCountLabel(min: number, max: number | null) {
  if (!max) return `${min}+ hráčů`
  if (min === max) return `${min} hráčů`
  return `${min}–${max} hráčů`
}

type GameForm = { name: string; source: string; sourceNote: string; minPlayers: number; maxPlayers: string }
const emptyForm: GameForm = { name: '', source: 'steam', sourceNote: '', minPlayers: 1, maxPlayers: '' }

export function Games() {
  const { isAdmin } = useAuth()
  const [games, setGames] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<GameForm>({ ...emptyForm })
  const [editingId, setEditingId] = useState<number | null>(null)

  useEffect(() => { load() }, [])
  const load = () => api.games().then(setGames)

  const startEdit = (game: any) => {
    setEditingId(game.id)
    setForm({
      name: game.name,
      source: game.source,
      sourceNote: game.sourceNote || '',
      minPlayers: game.minPlayers,
      maxPlayers: game.maxPlayers ? String(game.maxPlayers) : '',
    })
    setShowForm(false)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setForm({ ...emptyForm })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const data = { ...form, maxPlayers: form.maxPlayers ? Number(form.maxPlayers) : null }

    if (editingId) {
      await api.updateGame(editingId, data)
      setEditingId(null)
    } else {
      await api.createGame(data)
      setShowForm(false)
    }
    setForm({ ...emptyForm })
    load()
  }

  const handleDelete = async (id: number) => {
    if (confirm('Smazat tuto hru?')) {
      await api.deleteGame(id)
      if (editingId === id) cancelEdit()
      load()
    }
  }

  const formJsx = (
    <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg p-4 mb-4 border border-gray-700">
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
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Min hráčů</label>
            <input type="number" value={form.minPlayers} onChange={e => setForm({ ...form, minPlayers: Number(e.target.value) })}
              className="bg-gray-700 rounded px-3 py-2 text-white w-full" min="1" />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Max hráčů</label>
            <input type="number" placeholder="–" value={form.maxPlayers} onChange={e => setForm({ ...form, maxPlayers: e.target.value })}
              className="bg-gray-700 rounded px-3 py-2 text-white w-full" min="1" />
          </div>
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm">
          {editingId ? 'Uložit' : 'Přidat'}
        </button>
        <button type="button" onClick={() => { editingId ? cancelEdit() : setShowForm(false) }}
          className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm">Zrušit</button>
      </div>
    </form>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Hry</h1>
        {isAdmin && !editingId && (
          <button onClick={() => { setShowForm(!showForm); cancelEdit() }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm">
            + Přidat hru
          </button>
        )}
      </div>

      {showForm && !editingId && formJsx}

      <div className="space-y-2">
        {games.map(game => (
          editingId === game.id ? (
            <div key={game.id}>{formJsx}</div>
          ) : (
            <div key={game.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700 flex items-center justify-between">
              <div className="flex items-center flex-wrap gap-2">
                <span className="font-medium">{game.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${sourceBadgeClass(game.source)}`}>
                  {SOURCE_OPTIONS.find(o => o.value === game.source)?.label || game.source}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">
                  {playerCountLabel(game.minPlayers, game.maxPlayers)}
                </span>
                {game.sourceNote && <span className="text-xs text-gray-500">{game.sourceNote}</span>}
              </div>
              {isAdmin && (
                <div className="flex gap-3 ml-4 flex-shrink-0">
                  <button onClick={() => startEdit(game)} className="text-blue-400 hover:text-blue-300 text-sm">Upravit</button>
                  <button onClick={() => handleDelete(game.id)} className="text-red-500 hover:text-red-400 text-sm">Smazat</button>
                </div>
              )}
            </div>
          )
        ))}
        {games.length === 0 && <p className="text-gray-500 text-center mt-8">Zatím žádné hry</p>}
      </div>
    </div>
  )
}
