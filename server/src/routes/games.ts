import { Router, Request } from 'express'
import { requireAuth, requireAdmin } from '../middleware/auth'
import { prisma } from '../lib/prisma'
import { notifyGameProposed, notifyGamePromoted } from '../services/discord'

const router = Router()

// Bronze game with this many votes moves to silver automatically
const VOTES_TO_PROMOTE = 5

const TIERS = ['gold', 'silver', 'bronze']
const SOURCES = ['steam', 'epic', 'copied', 'web']

const userSelect = { id: true, displayName: true } as const

const gameInclude = {
  submittedBy: { select: userSelect },
  votes: {
    select: { userId: true, user: { select: userSelect } },
    orderBy: { createdAt: 'asc' as const },
  },
}

// Only http(s) links, so a stored URL can't become a javascript: href
function parseStoreUrl(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return ''
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value.trim())
    return url.protocol === 'http:' || url.protocol === 'https:' ? value.trim() : null
  } catch {
    return null
  }
}

function parsePrice(value: unknown): number | null {
  const n = Number(value)
  return value === '' || value === null || !Number.isFinite(n) || n < 0 ? null : Math.round(n)
}

// Proposer may edit or delete their own game while it is still a bronze proposal
async function loadEditable(req: Request) {
  const game = await prisma.game.findUnique({ where: { id: Number(req.params.id) } })
  if (!game) return { error: 404 as const }
  const isAdmin = req.session.role === 'admin'
  const isOwnProposal = game.submittedById === req.session.userId && game.tier === 'bronze'
  if (!isAdmin && !isOwnProposal) return { error: 403 as const }
  return { game, isAdmin }
}

// List all games with votes
router.get('/', requireAuth, async (_req, res) => {
  const games = await prisma.game.findMany({
    orderBy: { name: 'asc' },
    include: gameInclude,
  })
  res.json({ games, votesToPromote: VOTES_TO_PROMOTE })
})

// Propose a game — anyone; members always land in bronze, admin may pick the tier
router.post('/', requireAuth, async (req, res) => {
  const { name, source, sourceNote, minPlayers, maxPlayers, tier } = req.body
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'Název je povinný' })
  const price = parsePrice(req.body.price)
  if (price === null) return res.status(400).json({ error: 'Vyplň cenu (0 = zdarma)' })
  const storeUrl = parseStoreUrl(req.body.storeUrl)
  if (storeUrl === null) return res.status(400).json({ error: 'Odkaz musí začínat http:// nebo https://' })

  const userId = req.session.userId!
  const finalTier = req.session.role === 'admin' && TIERS.includes(tier) ? tier : 'bronze'

  const game = await prisma.game.create({
    data: {
      name: String(name).trim(),
      source: SOURCES.includes(source) ? source : 'steam',
      sourceNote: sourceNote || '',
      minPlayers: minPlayers || 1,
      maxPlayers: maxPlayers || null,
      storeUrl,
      price,
      tier: finalTier,
      submittedById: userId,
      // Proposing counts as the proposer's own vote
      ...(finalTier !== 'gold' && { votes: { create: { userId } } }),
    },
    include: gameInclude,
  })

  if (game.tier === 'bronze') {
    notifyGameProposed(game.name, game.price ?? 0, game.storeUrl, game.submittedBy?.displayName ?? '?', VOTES_TO_PROMOTE)
  }
  res.json(game)
})

// Update game — admin, or proposer while bronze; only admin changes tier
router.put('/:id', requireAuth, async (req, res) => {
  const result = await loadEditable(req)
  if (result.error) return res.status(result.error).json({ error: result.error === 404 ? 'Hra nenalezena' : 'Nemáte oprávnění' })

  const { name, source, sourceNote, minPlayers, maxPlayers, tier } = req.body
  const price = req.body.price !== undefined ? parsePrice(req.body.price) : undefined
  if (price === null) return res.status(400).json({ error: 'Vyplň cenu (0 = zdarma)' })
  const storeUrl = req.body.storeUrl !== undefined ? parseStoreUrl(req.body.storeUrl) : undefined
  if (storeUrl === null) return res.status(400).json({ error: 'Odkaz musí začínat http:// nebo https://' })
  if (name !== undefined && !String(name).trim()) return res.status(400).json({ error: 'Název je povinný' })

  const game = await prisma.game.update({
    where: { id: result.game.id },
    data: {
      ...(name !== undefined && { name: String(name).trim() }),
      ...(SOURCES.includes(source) && { source }),
      ...(sourceNote !== undefined && { sourceNote }),
      ...(minPlayers !== undefined && { minPlayers }),
      ...(maxPlayers !== undefined && { maxPlayers }),
      ...(storeUrl !== undefined && { storeUrl }),
      ...(price !== undefined && { price }),
      ...(result.isAdmin && TIERS.includes(tier) && { tier }),
    },
    include: gameInclude,
  })
  res.json(game)
})

// Toggle own vote ("chci hrát, koupím si to") on a bronze or silver game
router.post('/:id/vote', requireAuth, async (req, res) => {
  const gameId = Number(req.params.id)
  const userId = req.session.userId!
  const game = await prisma.game.findUnique({ where: { id: gameId } })
  if (!game) return res.status(404).json({ error: 'Hra nenalezena' })
  if (game.tier === 'gold') return res.status(400).json({ error: 'Zlaté hry se nehlasují' })

  const existing = await prisma.gameVote.findUnique({ where: { gameId_userId: { gameId, userId } } })
  if (existing) {
    await prisma.gameVote.delete({ where: { id: existing.id } })
  } else {
    await prisma.gameVote.create({ data: { gameId, userId } })
    const votes = await prisma.gameVote.count({ where: { gameId } })
    if (votes >= VOTES_TO_PROMOTE) {
      // updateMany guards against two simultaneous votes both announcing the promotion
      const promoted = await prisma.game.updateMany({ where: { id: gameId, tier: 'bronze' }, data: { tier: 'silver' } })
      if (promoted.count === 1) notifyGamePromoted(game.name, game.price ?? 0, votes)
    }
  }

  const updated = await prisma.game.findUnique({ where: { id: gameId }, include: gameInclude })
  res.json(updated)
})

// Delete game — admin, or proposer while bronze
router.delete('/:id', requireAuth, async (req, res) => {
  const result = await loadEditable(req)
  if (result.error) return res.status(result.error).json({ error: result.error === 404 ? 'Hra nenalezena' : 'Nemáte oprávnění' })
  await prisma.game.delete({ where: { id: result.game.id } })
  res.json({ ok: true })
})

export default router
