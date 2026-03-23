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
  return source === 'steam' ? 'badge badge-blue' :
    source === 'epic' ? 'badge badge-orange' :
    source === 'copied' ? 'badge badge-yellow' :
    source === 'free' ? 'badge badge-green' :
    'badge badge-gray'
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
    <form onSubmit={handleSubmit} className="card p-4 mb-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="form-label">Název hry</label>
          <input placeholder="Counter-Strike 2" value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })} required
            className="form-input" />
        </div>
        <div>
          <label className="form-label">Zdroj</label>
          <select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}
            className="form-select">
            {SOURCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Poznámka ke zdroji</label>
          <input placeholder="Volitelné" value={form.sourceNote}
            onChange={e => setForm({ ...form, sourceNote: e.target.value })}
            className="form-input" />
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="form-label">Min hráčů</label>
            <input type="number" value={form.minPlayers}
              onChange={e => setForm({ ...form, minPlayers: Number(e.target.value) })}
              className="form-input" min="1" />
          </div>
          <div className="flex-1">
            <label className="form-label">Max hráčů</label>
            <input type="number" placeholder="–" value={form.maxPlayers}
              onChange={e => setForm({ ...form, maxPlayers: e.target.value })}
              className="form-input" min="1" />
          </div>
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button type="submit" className="btn-primary">
          {editingId ? 'Uložit' : 'Přidat'}
        </button>
        <button type="button" onClick={() => { editingId ? cancelEdit() : setShowForm(false) }}
          className="btn-secondary">Zrušit</button>
      </div>
    </form>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-heading">Hry</h1>
        {isAdmin && !editingId && (
          <button onClick={() => { setShowForm(!showForm); cancelEdit() }} className="btn-primary">
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
            <div key={game.id} className="card px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center flex-wrap gap-2">
                <span className="font-medium text-zinc-100">{game.name}</span>
                <span className={sourceBadgeClass(game.source)}>
                  {SOURCE_OPTIONS.find(o => o.value === game.source)?.label || game.source}
                </span>
                <span className="badge badge-gray">
                  {playerCountLabel(game.minPlayers, game.maxPlayers)}
                </span>
                {game.sourceNote && <span className="text-xs text-zinc-500">{game.sourceNote}</span>}
              </div>
              {isAdmin && (
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => startEdit(game)} className="btn-ghost text-xs py-1">Upravit</button>
                  <button onClick={() => handleDelete(game.id)} className="btn-danger text-xs py-1">Smazat</button>
                </div>
              )}
            </div>
          )
        ))}
        {games.length === 0 && (
          <p className="text-zinc-600 text-center mt-8 text-sm">Zatím žádné hry</p>
        )}
      </div>
    </div>
  )
}
