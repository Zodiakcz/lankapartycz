import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { SOURCE_OPTIONS, SOURCE_LABELS, sourceBadgeClass, GAME_TIERS, priceLabel, priceBadgeClass } from '../lib/constants'
import type { Game, GameTier } from '../lib/types'

// Game picture, or the game's initials when there is none or it fails to load
function GameThumb({ game, className }: { game: Game; className: string }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [game.imageUrl])
  const box = `${className} aspect-[460/215] rounded-lg bg-zinc-800`
  if (game.imageUrl && !failed) {
    return <img src={game.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" className={`${box} object-cover`} onError={() => setFailed(true)} />
  }
  const initials = game.name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
  return (
    <div className={`${box} flex items-center justify-center text-zinc-500 font-bold tracking-wider select-none`} aria-hidden>
      {initials}
    </div>
  )
}

function playerCountLabel(min: number, max: number | null) {
  if (!max) return `${min}+ hráčů`
  if (min === max) return `${min} hráčů`
  return `${min}–${max} hráčů`
}

type GameForm = {
  name: string; source: string; sourceNote: string; minPlayers: number; maxPlayers: string
  storeUrl: string; imageUrl: string; price: string; tier: GameTier
}
const emptyForm: GameForm = {
  name: '', source: 'steam', sourceNote: '', minPlayers: 1, maxPlayers: '', storeUrl: '', imageUrl: '', price: '', tier: 'bronze',
}

export function Games() {
  const { user, isAdmin } = useAuth()
  const [games, setGames] = useState<Game[]>([])
  const [votesToPromote, setVotesToPromote] = useState(5)
  // Where the new-game form opens: under the page header or in the bronze section
  const [showForm, setShowForm] = useState<false | 'top' | 'bronze'>(false)
  const [form, setForm] = useState<GameForm>({ ...emptyForm })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [votingId, setVotingId] = useState<number | null>(null)

  useEffect(() => { load() }, [])
  const load = () => api.games().then(r => { setGames(r.games); setVotesToPromote(r.votesToPromote) })

  const replaceGame = (game: Game) => setGames(gs => gs.map(g => g.id === game.id ? game : g))

  const canEdit = (game: Game) => isAdmin || (game.submittedById === user?.id && game.tier === 'bronze')

  const startEdit = (game: Game) => {
    setEditingId(game.id)
    setError('')
    setForm({
      name: game.name,
      source: game.source,
      sourceNote: game.sourceNote || '',
      minPlayers: game.minPlayers,
      maxPlayers: game.maxPlayers ? String(game.maxPlayers) : '',
      storeUrl: game.storeUrl || '',
      imageUrl: game.imageUrl || '',
      price: game.price === null ? '' : String(game.price),
      tier: game.tier,
    })
    setShowForm(false)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setError('')
    setForm({ ...emptyForm })
  }

  const setSource = (source: string) => {
    // Local copies and web games cost nothing, save people typing the zero
    const price = (source === 'copied' || source === 'web') && form.price === '' ? '0' : form.price
    setForm({ ...form, source, price })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const data = {
      ...form,
      price: Number(form.price),
      maxPlayers: form.maxPlayers ? Number(form.maxPlayers) : null,
    }
    try {
      if (editingId) {
        await api.updateGame(editingId, data)
        setEditingId(null)
      } else {
        await api.createGame(data)
        setShowForm(false)
      }
      setForm({ ...emptyForm })
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Uložení se nepovedlo')
    }
  }

  const handleDelete = async (id: number) => {
    if (confirm('Smazat tuto hru?')) {
      await api.deleteGame(id)
      if (editingId === id) cancelEdit()
      load()
    }
  }

  const handleVote = async (id: number) => {
    setVotingId(id)
    try {
      replaceGame(await api.toggleGameVote(id))
    } finally {
      setVotingId(null)
    }
  }

  const handleTierChange = async (id: number, tier: GameTier) => {
    replaceGame(await api.updateGame(id, { tier }))
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
          <select value={form.source} onChange={e => setSource(e.target.value)}
            className="form-select">
            {SOURCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Cena (Kč, 0 = zdarma)</label>
          <input type="number" placeholder="349" value={form.price}
            onChange={e => setForm({ ...form, price: e.target.value })} required
            className="form-input" min="0" />
        </div>
        <div>
          <label className="form-label">Odkaz na hru</label>
          <input type="url" placeholder="https://store.steampowered.com/app/..." value={form.storeUrl}
            onChange={e => setForm({ ...form, storeUrl: e.target.value })}
            className="form-input" />
        </div>
        <div>
          <label className="form-label">Obrázek (nepovinné)</label>
          <input type="url" placeholder="Doplní se sám z odkazu na hru" value={form.imageUrl}
            onChange={e => setForm({ ...form, imageUrl: e.target.value })}
            className="form-input" />
        </div>
        <div>
          <label className="form-label">Poznámka</label>
          <input placeholder="Volitelné, např. sleva do neděle" value={form.sourceNote}
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
        {isAdmin && (
          <div>
            <label className="form-label">Kategorie</label>
            <select value={form.tier} onChange={e => setForm({ ...form, tier: e.target.value as GameTier })}
              className="form-select">
              {GAME_TIERS.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
            </select>
          </div>
        )}
      </div>
      {!editingId && !isAdmin && (
        <p className="text-xs text-zinc-500 mt-3">
          Návrh se objeví mezi bronzovými hrami a tvůj hlas se započítá rovnou.
          Při {votesToPromote} hlasech hra postoupí mezi stříbrné.
        </p>
      )}
      {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
      <div className="flex gap-2 mt-4">
        <button type="submit" className="btn-primary">
          {editingId ? 'Uložit' : 'Navrhnout'}
        </button>
        <button type="button" onClick={() => { editingId ? cancelEdit() : setShowForm(false) }}
          className="btn-secondary">Zrušit</button>
      </div>
    </form>
  )

  const badges = (game: Game) => (
    <>
      {game.price !== null && <span className={priceBadgeClass(game.price)}>{priceLabel(game.price)}</span>}
      <span className={sourceBadgeClass(game.source)}>{SOURCE_LABELS[game.source] ?? game.source}</span>
      <span className="badge badge-gray">
        {playerCountLabel(game.minPlayers, game.maxPlayers)}
      </span>
      {game.storeUrl && (
        <a href={game.storeUrl} target="_blank" rel="noopener noreferrer"
          className="badge badge-blue hover:opacity-80 transition-opacity">
          Odkaz ↗
        </a>
      )}
    </>
  )

  const actions = (game: Game) => (
    <div className="flex gap-1 flex-shrink-0 items-center">
      {isAdmin && (
        <select value={game.tier} onChange={e => handleTierChange(game.id, e.target.value as GameTier)}
          className="form-select w-auto py-1 text-xs" aria-label="Kategorie">
          {GAME_TIERS.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
        </select>
      )}
      {canEdit(game) && (
        <>
          <button onClick={() => startEdit(game)} className="btn-ghost text-xs py-1">Upravit</button>
          <button onClick={() => handleDelete(game.id)} className="btn-danger text-xs py-1">Smazat</button>
        </>
      )}
    </div>
  )

  const voteButton = (game: Game, label: string, idleClass: string) => {
    const voted = game.votes.some(v => v.userId === user?.id)
    return (
      <button onClick={() => handleVote(game.id)} disabled={votingId === game.id}
        className={`${voted ? 'btn-secondary' : idleClass} text-xs py-1.5 disabled:opacity-50`}>
        {voted ? '✓ Hlasuješ (zrušit)' : label}
      </button>
    )
  }

  const voterNames = (game: Game) => game.votes.map(v => v.user.displayName).join(', ')

  // Gold and silver: compact rows
  const gameRow = (game: Game) => (
    editingId === game.id ? (
      <div key={game.id}>{formJsx}</div>
    ) : (
      <div key={game.id} className="card px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
          <GameThumb game={game} className="w-20 sm:w-24 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-2">
              <span className="font-medium text-zinc-100">{game.name}</span>
              {badges(game)}
              {game.sourceNote && <span className="text-xs text-zinc-500">{game.sourceNote}</span>}
            </div>
            {game.tier === 'silver' && game.votes.length > 0 && (
              <p className="text-xs text-zinc-500 mt-1">Mají / kupují: {voterNames(game)}</p>
            )}
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0 items-center flex-wrap">
          {game.tier === 'silver' && voteButton(game, 'Mám / koupím', 'btn-ghost')}
          {actions(game)}
        </div>
      </div>
    )
  )

  // Bronze: bigger cards that sell the game and show vote progress
  const proposalCard = (game: Game) => {
    if (editingId === game.id) return <div key={game.id}>{formJsx}</div>
    const progress = Math.min(100, (game.votes.length / votesToPromote) * 100)
    return (
      <div key={game.id} className="card p-4 flex flex-col sm:flex-row gap-4">
        <GameThumb game={game} className="w-full sm:w-48 flex-shrink-0 self-start" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-semibold text-zinc-100">{game.name}</div>
              {game.submittedBy && <div className="text-xs text-zinc-500">navrhl/a {game.submittedBy.displayName}</div>}
            </div>
          </div>
          <div className="flex items-center flex-wrap gap-2">
            {badges(game)}
            {game.sourceNote && <span className="text-xs text-zinc-500">{game.sourceNote}</span>}
          </div>
          <div>
            <div className="flex justify-between text-xs text-zinc-400 mb-1">
              <span>{voterNames(game) || 'Zatím nikdo'}</span>
              <span className="whitespace-nowrap">{game.votes.length} / {votesToPromote}</span>
            </div>
            <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
              <div className="h-full bg-amber-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
            {voteButton(game, '👍 Chci hrát, koupím', 'btn-primary')}
            {actions(game)}
          </div>
        </div>
      </div>
    )
  }

  const byTier = (tier: GameTier) => games.filter(g => g.tier === tier)
  const bronze = byTier('bronze').sort((a, b) => b.votes.length - a.votes.length || b.id - a.id)

  const openForm = (at: 'top' | 'bronze') => {
    cancelEdit()
    setShowForm(showForm === at ? false : at)
  }

  const section = (tier: GameTier, list: Game[], render: (g: Game) => React.ReactNode) => {
    const meta = GAME_TIERS.find(t => t.value === tier)!
    return (
      <section key={tier} className="mb-8">
        <div className="flex items-center justify-between gap-2 mb-1">
          <h2 className="section-heading mb-0">{meta.icon} {meta.label} hry <span className="text-zinc-500 font-normal">({list.length})</span></h2>
          {tier === 'bronze' && !editingId && (
            <button onClick={() => openForm('bronze')} className="btn-secondary text-xs py-1.5">+ Navrhnout</button>
          )}
        </div>
        <p className="text-xs text-zinc-500 mb-3">{meta.hint}</p>
        {tier === 'bronze' && showForm === 'bronze' && !editingId && formJsx}
        <div className="space-y-2">
          {list.map(render)}
          {list.length === 0 && <p className="text-zinc-600 text-sm">Zatím žádné</p>}
        </div>
      </section>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-heading">Hry</h1>
        {!editingId && (
          <button onClick={() => openForm('top')} className="btn-primary">
            + Navrhnout hru
          </button>
        )}
      </div>

      {showForm === 'top' && !editingId && formJsx}

      {section('gold', byTier('gold'), gameRow)}
      {section('silver', byTier('silver'), gameRow)}
      {section('bronze', bronze, proposalCard)}
    </div>
  )
}
