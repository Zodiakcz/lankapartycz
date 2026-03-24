import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAuth, requireAdmin } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

// GET all FAQ items
router.get('/', requireAuth, async (_req, res) => {
  const items = await prisma.faqItem.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] })
  res.json(items)
})

// POST create FAQ item (admin only)
router.post('/', requireAdmin, async (req, res) => {
  const { question, answer, order } = req.body
  if (!question || !answer) {
    res.status(400).json({ error: 'question a answer jsou povinné' })
    return
  }
  const item = await prisma.faqItem.create({ data: { question, answer, order: order ?? 0 } })
  res.json(item)
})

// PUT update FAQ item (admin only)
router.put('/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  const { question, answer, order } = req.body
  const item = await prisma.faqItem.update({ where: { id }, data: { question, answer, order } })
  res.json(item)
})

// DELETE FAQ item (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  await prisma.faqItem.delete({ where: { id } })
  res.json({ ok: true })
})

export default router
