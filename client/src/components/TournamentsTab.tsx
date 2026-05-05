import { useState, useEffect, useMemo } from 'react'
import { api } from '../lib/api'
import type { Tournament, TournamentEntrant, TournamentMatch, Attendance } from '../lib/types'

export function TournamentsTab({
  partyId,
  isAdmin,
  attendance,
}: {
  partyId: number
  isAdmin: boolean
  attendance: Attendance[]
}) {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  const eligible = useMemo(
    () => attendance.filter(a => a.status === 'confirmed' || a.status === 'maybe'),
    [attendance],
  )

  const load = async () => {
    setLoading(true)
    try {
      setTournaments(await api.getTournaments(partyId))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [partyId])

  if (loading) return <div className="text-zinc-500">Načítání...</div>

  return (
    <div className="space-y-6">
      {isAdmin && (
        <div>
          {creating ? (
            <CreateTournamentForm
              eligible={eligible}
              onCancel={() => setCreating(false)}
              onCreate={async (data) => {
                await api.createTournament(partyId, data)
                setCreating(false)
                load()
              }}
            />
          ) : (
            <button
              onClick={() => setCreating(true)}
              disabled={eligible.length < 2}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + Nový turnaj
            </button>
          )}
          {eligible.length < 2 && (
            <p className="text-xs text-zinc-500 mt-2">
              Pro turnaj potřebuješ alespoň 2 účastníky se statusem Potvrzeno nebo Možná.
            </p>
          )}
        </div>
      )}

      {tournaments.length === 0 && !creating && (
        <div className="card p-6 text-center text-zinc-500">
          {isAdmin ? 'Zatím žádné turnaje. Vytvoř první.' : 'Zatím žádné turnaje.'}
        </div>
      )}

      {tournaments.map(t => (
        <TournamentCard key={t.id} tournament={t} isAdmin={isAdmin} onChange={load} />
      ))}
    </div>
  )
}

function entrantLabel(e: TournamentEntrant | undefined): string {
  if (!e) return ''
  if (e.user2) return `${e.user1.displayName} & ${e.user2.displayName}`
  return e.user1.displayName
}

function CreateTournamentForm({
  eligible,
  onCreate,
  onCancel,
}: {
  eligible: Attendance[]
  onCreate: (data: { name: string; format: '1v1' | '2v2'; participantUserIds: number[] }) => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [format, setFormat] = useState<'1v1' | '2v2'>('1v1')
  const [selected, setSelected] = useState<Set<number>>(() => new Set(eligible.filter(a => a.status === 'confirmed').map(a => a.userId)))
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const minPlayers = format === '1v1' ? 2 : 4
  const tooFew = selected.size < minPlayers

  const toggle = (uid: number) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(uid)) next.delete(uid)
      else next.add(uid)
      return next
    })
  }

  const submit = async () => {
    setError(null)
    if (!name.trim()) return setError('Zadej název')
    if (tooFew) return setError(`Vyber alespoň ${minPlayers} hráčů`)
    setSubmitting(true)
    try {
      await onCreate({ name: name.trim(), format, participantUserIds: [...selected] })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chyba')
      setSubmitting(false)
    }
  }

  return (
    <div className="card p-4">
      <h3 className="font-semibold mb-3">Nový turnaj</h3>
      <div className="space-y-3">
        <div>
          <label className="form-label">Název</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="CS2, Mariáš, FIFA..."
            className="form-input"
          />
        </div>
        <div>
          <label className="form-label">Formát</label>
          <div className="flex gap-2">
            {(['1v1', '2v2'] as const).map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setFormat(f)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
                  format === f
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="form-label">Účastníci ({selected.size})</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {eligible.map(a => (
              <label
                key={a.userId}
                className="flex items-center gap-2 bg-zinc-800/60 rounded-lg px-2 py-1.5 cursor-pointer hover:bg-zinc-800"
              >
                <input
                  type="checkbox"
                  checked={selected.has(a.userId)}
                  onChange={() => toggle(a.userId)}
                  className="accent-indigo-500"
                />
                <span className="text-sm">{a.user.displayName}</span>
                {a.status === 'maybe' && <span className="text-xs text-amber-400">(možná)</span>}
              </label>
            ))}
          </div>
          {format === '2v2' && selected.size % 2 === 1 && (
            <p className="text-xs text-amber-400 mt-2">
              Lichý počet hráčů — jeden bude náhodně vybrán a turnaj přeskočí.
            </p>
          )}
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="btn-ghost">Zrušit</button>
          <button onClick={submit} disabled={submitting || tooFew || !name.trim()} className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
            {submitting ? 'Vytvářím...' : 'Vylosovat'}
          </button>
        </div>
      </div>
    </div>
  )
}

function TournamentCard({
  tournament,
  isAdmin,
  onChange,
}: {
  tournament: Tournament
  isAdmin: boolean
  onChange: () => void
}) {
  const entrantById = useMemo(
    () => new Map(tournament.entrants.map(e => [e.id, e])),
    [tournament.entrants],
  )
  const matchById = useMemo(
    () => new Map(tournament.matches.map(m => [m.id, m])),
    [tournament.matches],
  )

  const sittingOut = tournament.entrants.filter(e => e.sittingOut)
  const playingEntrants = tournament.entrants.filter(e => !e.sittingOut)
  const finalMatch = tournament.matches.length
    ? tournament.matches.reduce((a, b) => (b.round > a.round ? b : a))
    : null
  const champion = finalMatch?.winnerEntrantId ? entrantById.get(finalMatch.winnerEntrantId) : null

  const resolveSide = (entrantId: number | null, fromMatchId: number | null): TournamentEntrant | null => {
    if (entrantId !== null) return entrantById.get(entrantId) ?? null
    if (fromMatchId !== null) {
      const upstream = matchById.get(fromMatchId)
      if (upstream?.winnerEntrantId) return entrantById.get(upstream.winnerEntrantId) ?? null
    }
    return null
  }

  const handleWinner = async (matchId: number, entrantId: number | null) => {
    try {
      await api.setMatchWinner(tournament.id, matchId, entrantId)
      onChange()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Chyba')
    }
  }

  const handleRegenerate = async () => {
    if (!confirm('Přelosovat turnaj? Nahradí se aktuální losování novým.')) return
    try {
      await api.regenerateTournament(tournament.id)
      onChange()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Chyba')
    }
  }

  const handleDelete = async () => {
    if (!confirm('Opravdu smazat turnaj?')) return
    await api.deleteTournament(tournament.id)
    onChange()
  }

  const rounds = useMemo(() => {
    const byRound = new Map<number, TournamentMatch[]>()
    for (const m of tournament.matches) {
      const arr = byRound.get(m.round) ?? []
      arr.push(m)
      byRound.set(m.round, arr)
    }
    return [...byRound.entries()].sort((a, b) => a[0] - b[0])
  }, [tournament.matches])

  const anyMatchPlayed = tournament.matches.some(m => m.winnerEntrantId !== null)

  // Round 1 is "Předkolo" (play-in) only if it doesn't contain all playing entrants
  const round1Matches = tournament.matches.filter(m => m.round === 1)
  const round1IsPlayIn = round1Matches.length > 0 && round1Matches.length * 2 < playingEntrants.length

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-lg">{tournament.name}</h3>
            <span className="badge badge-blue">{tournament.format}</span>
            {tournament.status === 'complete' ? (
              <span className="badge badge-green">Dokončeno</span>
            ) : (
              <span className="badge badge-yellow">Probíhá</span>
            )}
          </div>
          {champion && (
            <p className="text-sm text-emerald-400 mt-1">🏆 Vítěz: {entrantLabel(champion)}</p>
          )}
          {sittingOut.length > 0 && (
            <p className="text-xs text-amber-400 mt-1">
              Nehraje: {sittingOut.map(e => e.user1.displayName).join(', ')}
            </p>
          )}
        </div>
        {isAdmin && (
          <div className="flex gap-2 items-center">
            {!anyMatchPlayed && (
              <button onClick={handleRegenerate} className="btn-ghost text-xs">Přelosovat</button>
            )}
            <button onClick={handleDelete} className="btn-danger text-xs">Smazat</button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto -mx-4 px-4">
        <div className="flex gap-4 items-start min-w-max">
          {rounds.map(([round, ms], roundIdx) => {
            const isPlayIn = round === 1 && round1IsPlayIn
            const isFinal = roundIdx === rounds.length - 1
            const isSemi = roundIdx === rounds.length - 2 && rounds.length >= 2
            const heading = isPlayIn ? 'Předkolo' : isFinal ? 'Finále' : isSemi ? 'Semifinále' : `Kolo ${round}`
            return (
              <div key={round} className="flex flex-col gap-2 min-w-[180px]">
                <div className="text-xs uppercase tracking-wide text-zinc-500 font-semibold">{heading}</div>
                <div className="flex flex-col gap-3 justify-around h-full">
                  {ms.map(m => {
                    const side1 = resolveSide(m.side1EntrantId, m.side1FromMatchId)
                    const side2 = resolveSide(m.side2EntrantId, m.side2FromMatchId)
                    const winner = m.winnerEntrantId
                    return (
                      <div key={m.id} className="card-inner overflow-hidden">
                        <MatchSide
                          entrant={side1}
                          isWinner={winner === side1?.id}
                          isLoser={winner !== null && winner !== side1?.id && side1 !== null}
                          canPick={isAdmin && side1 !== null && side2 !== null}
                          onPick={() => side1 && handleWinner(m.id, winner === side1.id ? null : side1.id)}
                        />
                        <div className="border-t border-white/8" />
                        <MatchSide
                          entrant={side2}
                          isWinner={winner === side2?.id}
                          isLoser={winner !== null && winner !== side2?.id && side2 !== null}
                          canPick={isAdmin && side1 !== null && side2 !== null}
                          onPick={() => side2 && handleWinner(m.id, winner === side2.id ? null : side2.id)}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function MatchSide({
  entrant,
  isWinner,
  isLoser,
  canPick,
  onPick,
}: {
  entrant: TournamentEntrant | null
  isWinner: boolean
  isLoser: boolean
  canPick: boolean
  onPick: () => void
}) {
  const label = entrant ? entrantLabel(entrant) : <span className="text-zinc-500 italic">čeká...</span>
  const baseClass = `w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 transition-colors ${
    isWinner ? 'bg-emerald-900/40 text-emerald-300 font-semibold' :
    isLoser ? 'text-zinc-500 line-through' :
    'text-zinc-200'
  }`
  if (canPick && entrant) {
    return (
      <button onClick={onPick} className={`${baseClass} hover:bg-indigo-900/30 cursor-pointer`}>
        <span className="truncate">{label}</span>
        {isWinner && <span className="text-xs">✓</span>}
      </button>
    )
  }
  return (
    <div className={baseClass}>
      <span className="truncate">{label}</span>
      {isWinner && <span className="text-xs">✓</span>}
    </div>
  )
}
