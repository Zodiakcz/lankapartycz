import { Router } from 'express'
import { requireAuth, requireAdmin } from '../middleware/auth'
import { prisma } from '../lib/prisma'

const router = Router()

// Get global packing items + party-specific items
router.get('/:partyId?', requireAuth, async (req, res) => {
  const partyId = req.params.partyId ? Number(req.params.partyId) : null
  const items = await prisma.packingItem.findMany({
    where: partyId ? { OR: [{ partyId: null }, { partyId }] } : { partyId: null },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  })
  res.json(items)
})

// Add packing item (admin)
router.post('/', requireAdmin, async (req, res) => {
  const { name, category, partyId } = req.body
  const item = await prisma.packingItem.create({
    data: { name, category: category || 'general', partyId: partyId || null },
  })
  res.json(item)
})

// Delete packing item (admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  await prisma.packingItem.delete({ where: { id: Number(req.params.id) } })
  res.json({ ok: true })
})

export default router
