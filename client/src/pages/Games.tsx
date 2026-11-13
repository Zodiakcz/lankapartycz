import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { SOURCE_OPTIONS, SOURCE_LABELS, sourceBadgeClass, GAME_TIERS, priceLabel } from '../lib/constants'
import type { Game, GameTier } from '../lib/types'
import { TierChip } from '../components/TierChip'
import { AvatarStack } from '../components/Avatar'

// Game header art (or the initials when there is none or it fails to load); opens the
// store page when the game has one, like a Steam capsule. Width and corners come from the caller.
function GameThumb({ game, className = '' }: { game: Game; className?: string }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [game.imageUrl])
  const initials = game.name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
  const pic = game.imageUrl && !failed
    ? <img src={game.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" className="w-full h-full object-cover" onError={() => setFailed(true)} />
    : (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-700 to-zinc-900 text-xl text-zinc-400 font-extrabold tracking-widest select-none" aria-hidden>
        {initials}
      </div>
    )
  const box = `${className} relative block aspect-[460/215] overflow-hidden bg-zinc-800`
  if (!game.storeUrl) return <div className={box}>{pic}</div>
  return (
    <a href={game.storeUrl} target="_blank" rel="noopener noreferrer" title="Otevřít stránku hry" className={`${box} group/thumb`}>
      {pic}
      <span className="absolute top-1.5 right-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white/80 group-hover/thumb:text-white group-hover/thumb:bg-indigo-600 transition-colors">
        ↗
      </span>
    </a>
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
              {GAME_TIERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
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

  // Steam-style tags; the price sits apart in its own dark block
  const tags = (game: Game) => (
    <>
      <span className={sourceBadgeClass(game.source)}>{SOURCE_LABELS[game.source] ?? game.source}</span>
      <span className="badge badge-gray">{playerCountLabel(game.minPlayers, game.maxPlayers)}</span>
      {game.sourceNote && <span className="text-xs text-zinc-500">{game.sourceNote}</span>}
    </>
  )

  const price = (game: Game) => game.price === null ? null : (
    <span className={`price-block ${game.price > 0 ? '' : 'price-free'}`}>{priceLabel(game.price)}</span>
  )

  const actions = (game: Game) => (
    <div className="flex flex-wrap gap-1 items-center min-w-0">
      {isAdmin && (
        <select value={game.tier} onChange={e => handleTierChange(game.id, e.target.value as GameTier)}
          className="form-select w-auto py-1 text-xs" aria-label="Kategorie">
          {GAME_TIERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
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
        className={`${voted ? 'btn-voted' : idleClass} text-xs py-1.5 disabled:opacity-50`}>
        {voted ? '✓ Hlasuješ (zrušit)' : label}
      </button>
    )
  }

  const voters = (game: Game) => game.votes.map(v => v.user)
  const voterNames = (game: Game) => game.votes.map(v => v.user.displayName).join(', ')
  const editForm = (game: Game, span = '') => <div key={game.id} className={span}>{formJsx}</div>

  // Gold: big capsules in a grid, like the Steam library
  const goldCapsule = (game: Game) => editingId === game.id ? editForm(game, 'col-span-full') : (
    <div key={game.id} className="capsule flex flex-col">
      <GameThumb game={game} className="w-full" />
      <div className="flex-1 flex flex-col gap-2 p-3 bg-gradient-to-b from-zinc-800/50 to-zinc-900">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-white leading-snug">{game.name}</h3>
          {price(game)}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">{tags(game)}</div>
        {(isAdmin || canEdit(game)) && <div className="mt-auto pt-2 border-t border-white/5">{actions(game)}</div>}
      </div>
    </div>
  )

  // Silver: Steam store list rows, price and "own it" on the right
  const silverRow = (game: Game) => editingId === game.id ? editForm(game) : (
    <div key={game.id} className="card overflow-hidden flex hover:bg-zinc-800/60 transition-colors">
      <GameThumb game={game} className="w-28 m-3 mr-0 rounded self-start sm:w-[184px] sm:m-0 sm:rounded-none sm:self-stretch sm:aspect-auto sm:min-h-[86px] shrink-0" />
      <div className="flex-1 min-w-0 flex flex-col lg:flex-row lg:items-center gap-3 px-4 py-3">
        <div className="flex-1 min-w-0 space-y-1.5">
          <h3 className="font-semibold text-white truncate">{game.name}</h3>
          <div className="flex flex-wrap items-center gap-1.5">{tags(game)}</div>
          {game.votes.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-zinc-400 min-w-0">
              <AvatarStack users={voters(game)} />
              <span className="truncate">Mají / kupují: {voterNames(game)}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap lg:flex-nowrap">
          {price(game)}
          {voteButton(game, 'Mám / koupím', 'btn-secondary')}
          {actions(game)}
        </div>
      </div>
    </div>
  )

  // Bronze: wishlist cards that sell the game and show how far it is from silver
  const proposalCard = (game: Game) => {
    if (editingId === game.id) return editForm(game)
    const votes = game.votes.length
    const progress = Math.min(100, (votes / votesToPromote) * 100)
    return (
      <div key={game.id} className="card p-3 flex flex-col sm:flex-row gap-4">
        <GameThumb game={game} className="w-full sm:w-[292px] rounded shadow-md shadow-black/40 self-start shrink-0" />
        <div className="flex-1 min-w-0 sm:py-1 sm:pr-1 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-white leading-tight">{game.name}</h3>
              {game.submittedBy && <p className="text-xs text-zinc-500 mt-0.5">navrhl/a {game.submittedBy.displayName}</p>}
            </div>
            {price(game)}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">{tags(game)}</div>
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5 min-h-[24px]">
              {votes > 0 ? <AvatarStack users={voters(game)} /> : <span className="text-xs text-zinc-500">Zatím nikdo</span>}
              <span className="text-xs text-zinc-400 whitespace-nowrap">
                <span className="font-semibold text-white">{votes}</span> / {votesToPromote} hlasů do stříbra
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-black/40 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 flex-wrap mt-auto">
            {voteButton(game, 'Chci hrát, koupím', 'btn-primary')}
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

  const section = (tier: GameTier, list: Game[], render: (g: Game) => React.ReactNode, layout: string) => {
    const meta = GAME_TIERS.find(t => t.value === tier)!
    return (
      <section key={tier} className="mb-10">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center flex-wrap gap-x-3 gap-y-1">
            <h2 className="section-heading mb-0 flex items-center gap-2">
              <TierChip tier={tier} className="min-w-[1.5rem]">{list.length}</TierChip>
              {meta.label} hry
            </h2>
            <span className="text-xs text-zinc-500">{meta.hint}</span>
          </div>
          {tier === 'bronze' && !editingId && (
            <button onClick={() => openForm('bronze')} className="btn-secondary text-xs py-1.5 shrink-0">+ Navrhnout</button>
          )}
        </div>
        <div className="h-px bg-gradient-to-r from-indigo-400/50 via-indigo-400/10 to-transparent mt-2 mb-4" />
        {tier === 'bronze' && showForm === 'bronze' && !editingId && formJsx}
        {list.length === 0
          ? <p className="text-zinc-600 text-sm">Zatím žádné</p>
          : <div className={layout}>{list.map(render)}</div>}
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

      {section('gold', byTier('gold'), goldCapsule, 'grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3 gap-4')}
      {section('silver', byTier('silver'), silverRow, 'space-y-2')}
      {section('bronze', bronze, proposalCard, 'space-y-3')}
    </div>
  )
}
