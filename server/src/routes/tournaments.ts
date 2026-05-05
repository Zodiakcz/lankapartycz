import { Router } from 'express'
import { requireAuth, requireAdmin } from '../middleware/auth'
import { prisma } from '../lib/prisma'
import { generateBracket, BracketError } from '../lib/bracket'

const router = Router()

const userSelect = { id: true, displayName: true } as const

const tournamentInclude = {
  entrants: {
    include: { user1: { select: userSelect }, user2: { select: userSelect } },
    orderBy: { id: 'asc' as const },
  },
  matches: {
    orderBy: [{ round: 'asc' as const }, { indexInRound: 'asc' as const }],
  },
}

// List tournaments for a party
router.get('/party/:partyId', requireAuth, async (req, res) => {
  const partyId = Number(req.params.partyId)
  const tournaments = await prisma.tournament.findMany({
    where: { partyId },
    include: tournamentInclude,
    orderBy: { createdAt: 'asc' },
  })
  res.json(tournaments)
})

// Create a tournament (admin) — generates bracket atomically
router.post('/party/:partyId', requireAdmin, async (req, res) => {
  const partyId = Number(req.params.partyId)
  const { name, format, participantUserIds } = req.body as {
    name?: string
    format?: '1v1' | '2v2'
    participantUserIds?: number[]
  }

  if (!name || !name.trim()) return res.status(400).json({ error: 'Název je povinný' })
  if (format !== '1v1' && format !== '2v2') return res.status(400).json({ error: 'Neplatný formát' })
  if (!Array.isArray(participantUserIds) || participantUserIds.length === 0) {
    return res.status(400).json({ error: 'Vyber alespoň jednoho účastníka' })
  }

  const party = await prisma.party.findUnique({ where: { id: partyId } })
  if (!party) return res.status(404).json({ error: 'Párty nenalezena' })

  let bracket
  try {
    bracket = generateBracket(participantUserIds, format)
  } catch (e) {
    if (e instanceof BracketError) return res.status(400).json({ error: e.message })
    throw e
  }

  const created = await prisma.$transaction(async (tx) => {
    const tournament = await tx.tournament.create({
      data: { partyId, name: name.trim(), format },
    })

    const entrantIds: number[] = []
    for (const e of bracket.entrants) {
      const row = await tx.tournamentEntrant.create({
        data: { tournamentId: tournament.id, ...e },
      })
      entrantIds.push(row.id)
    }

    const matchIds: number[] = []
    for (const m of bracket.matches) {
      const row = await tx.tournamentMatch.create({
        data: {
          tournamentId: tournament.id,
          round: m.round,
          indexInRound: m.indexInRound,
          side1EntrantId: m.side1EntrantIdx !== null ? entrantIds[m.side1EntrantIdx] : null,
          side1FromMatchId: m.side1FromMatchIdx !== null ? matchIds[m.side1FromMatchIdx] : null,
          side2EntrantId: m.side2EntrantIdx !== null ? entrantIds[m.side2EntrantIdx] : null,
          side2FromMatchId: m.side2FromMatchIdx !== null ? matchIds[m.side2FromMatchIdx] : null,
        },
      })
      matchIds.push(row.id)
    }

    return tx.tournament.findUnique({ where: { id: tournament.id }, include: tournamentInclude })
  })

  res.json(created)
})

// Regenerate (reshuffle) — only if no match has a winner yet
router.post('/:id/regenerate', requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: { entrants: true, matches: true },
  })
  if (!tournament) return res.status(404).json({ error: 'Turnaj nenalezen' })
  if (tournament.matches.some((m) => m.winnerEntrantId !== null)) {
    return res.status(400).json({ error: 'Turnaj už začal — losování nejde přegenerovat' })
  }

  // Rebuild from the same user list
  const userIds: number[] = []
  for (const e of tournament.entrants) {
    userIds.push(e.user1Id)
    if (e.user2Id !== null) userIds.push(e.user2Id)
  }

  let bracket
  try {
    bracket = generateBracket(userIds, tournament.format as '1v1' | '2v2')
  } catch (e) {
    if (e instanceof BracketError) return res.status(400).json({ error: e.message })
    throw e
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.tournamentMatch.deleteMany({ where: { tournamentId: id } })
    await tx.tournamentEntrant.deleteMany({ where: { tournamentId: id } })

    const entrantIds: number[] = []
    for (const e of bracket.entrants) {
      const row = await tx.tournamentEntrant.create({ data: { tournamentId: id, ...e } })
      entrantIds.push(row.id)
    }
    const matchIds: number[] = []
    for (const m of bracket.matches) {
      const row = await tx.tournamentMatch.create({
        data: {
          tournamentId: id,
          round: m.round,
          indexInRound: m.indexInRound,
          side1EntrantId: m.side1EntrantIdx !== null ? entrantIds[m.side1EntrantIdx] : null,
          side1FromMatchId: m.side1FromMatchIdx !== null ? matchIds[m.side1FromMatchIdx] : null,
          side2EntrantId: m.side2EntrantIdx !== null ? entrantIds[m.side2EntrantIdx] : null,
          side2FromMatchId: m.side2FromMatchIdx !== null ? matchIds[m.side2FromMatchIdx] : null,
        },
      })
      matchIds.push(row.id)
    }
    await tx.tournament.update({ where: { id }, data: { status: 'active' } })
    return tx.tournament.findUnique({ where: { id }, include: tournamentInclude })
  })

  res.json(updated)
})

// Set or clear winner on a match
router.patch('/:id/match/:matchId', requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  const matchId = Number(req.params.matchId)
  const { winnerEntrantId } = req.body as { winnerEntrantId: number | null }

  const match = await prisma.tournamentMatch.findUnique({ where: { id: matchId } })
  if (!match || match.tournamentId !== id) return res.status(404).json({ error: 'Zápas nenalezen' })

  if (winnerEntrantId !== null) {
    // Validate winnerEntrantId is one of the two sides — resolve by walking from upstream if needed
    const resolved = await resolveSides(id, matchId)
    if (resolved.side1Id !== winnerEntrantId && resolved.side2Id !== winnerEntrantId) {
      return res.status(400).json({ error: 'Vítěz není v tomto zápase' })
    }
  }

  await prisma.tournamentMatch.update({
    where: { id: matchId },
    data: { winnerEntrantId },
  })

  // If this is the final, mark tournament complete/active accordingly
  const allMatches = await prisma.tournamentMatch.findMany({ where: { tournamentId: id } })
  const maxRound = allMatches.reduce((m, x) => Math.max(m, x.round), 0)
  const finalMatch = allMatches.find((m) => m.round === maxRound)
  const status = finalMatch?.winnerEntrantId ? 'complete' : 'active'
  await prisma.tournament.update({ where: { id }, data: { status } })

  const updated = await prisma.tournament.findUnique({ where: { id }, include: tournamentInclude })
  res.json(updated)
})

async function resolveSides(tournamentId: number, matchId: number): Promise<{ side1Id: number | null; side2Id: number | null }> {
  const all = await prisma.tournamentMatch.findMany({ where: { tournamentId } })
  const byId = new Map(all.map((m) => [m.id, m]))
  const resolveSide = (entrantId: number | null, fromMatchId: number | null): number | null => {
    if (entrantId !== null) return entrantId
    if (fromMatchId === null) return null
    const upstream = byId.get(fromMatchId)
    return upstream?.winnerEntrantId ?? null
  }
  const m = byId.get(matchId)
  if (!m) return { side1Id: null, side2Id: null }
  return {
    side1Id: resolveSide(m.side1EntrantId, m.side1FromMatchId),
    side2Id: resolveSide(m.side2EntrantId, m.side2FromMatchId),
  }
}

// Delete tournament
router.delete('/:id', requireAdmin, async (req, res) => {
  await prisma.tournament.delete({ where: { id: Number(req.params.id) } })
  res.json({ ok: true })
})

export default router
