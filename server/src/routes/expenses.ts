import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAuth, requireAdmin } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

// Get expenses for a party
router.get('/:partyId', requireAuth, async (req, res) => {
  const expenses = await prisma.expense.findMany({
    where: { partyId: Number(req.params.partyId) },
    include: { paidBy: { select: { id: true, displayName: true } } },
    orderBy: { createdAt: 'desc' },
  })
  res.json(expenses)
})

// Add expense
router.post('/:partyId', requireAuth, async (req, res) => {
  const { amount, description, paidByUserId } = req.body
  if (!amount || !description) {
    return res.status(400).json({ error: 'Vyplňte částku a popis' })
  }

  const expense = await prisma.expense.create({
    data: {
      partyId: Number(req.params.partyId),
      paidByUserId: paidByUserId || req.session.userId!,
      amount,
      description,
      isShared: true,
    },
    include: { paidBy: { select: { id: true, displayName: true } } },
  })
  res.json(expense)
})

// Delete expense (admin or the person who paid)
router.delete('/:id', requireAuth, async (req, res) => {
  const expense = await prisma.expense.findUnique({ where: { id: Number(req.params.id) } })
  if (!expense) return res.status(404).json({ error: 'Výdaj nenalezen' })

  if (req.session.role !== 'admin' && expense.paidByUserId !== req.session.userId) {
    return res.status(403).json({ error: 'Nemáte oprávnění' })
  }

  await prisma.expense.delete({ where: { id: Number(req.params.id) } })
  res.json({ ok: true })
})

// Calculate split for a party
router.get('/:partyId/split', requireAuth, async (req, res) => {
  const partyId = Number(req.params.partyId)

  const [party, expenses, attendance] = await Promise.all([
    prisma.party.findUnique({ where: { id: partyId } }),
    prisma.expense.findMany({ where: { partyId } }),
    prisma.attendance.findMany({
      where: { partyId, status: 'confirmed' },
      include: { user: { select: { id: true, displayName: true } } },
    }),
  ])

  if (!party) return res.status(404).json({ error: 'Párty nenalezena' })

  // Calculate nights and advance per person
  const personData: Record<number, { user: { id: number; displayName: string }; nights: number; advance: number }> = {}

  for (const att of attendance) {
    if (!att.arrival || !att.departure) continue
    const arrival = new Date(att.arrival)
    const departure = new Date(att.departure)
    const nights = Math.max(0, Math.ceil((departure.getTime() - arrival.getTime()) / (1000 * 60 * 60 * 24)))
    personData[att.userId] = { user: att.user, nights, advance: att.advance }
  }

  const totalNights = Object.values(personData).reduce((sum, p) => sum + p.nights, 0)
  const total = expenses.reduce((sum, e) => sum + e.amount, 0)
  const totalAdvances = Object.values(personData).reduce((sum, p) => sum + p.advance, 0)

  // Per person: share - (advance + expenses paid) = what they still owe
  const perPerson: Record<number, {
    user: { id: number; displayName: string }
    nights: number
    advance: number
    owes: number
    paid: number
    balance: number
  }> = {}

  for (const [userIdStr, data] of Object.entries(personData)) {
    const userId = Number(userIdStr)
    const share = totalNights > 0 ? (data.nights / totalNights) * total : 0
    const expensesPaid = expenses.filter(e => e.paidByUserId === userId).reduce((sum, e) => sum + e.amount, 0)
    const totalCredit = data.advance + expensesPaid
    // positive balance = overpaid (gets money back), negative = still owes
    const balance = totalCredit - share

    perPerson[userId] = {
      user: data.user,
      nights: data.nights,
      advance: Math.round(data.advance * 100) / 100,
      owes: Math.round(share * 100) / 100,
      paid: Math.round(expensesPaid * 100) / 100,
      balance: Math.round(balance * 100) / 100,
    }
  }

  res.json({
    sharedTotal: Math.round(total * 100) / 100,
    totalAdvances: Math.round(totalAdvances * 100) / 100,
    totalNights,
    perPerson: Object.values(perPerson),
  })
})

export default router
