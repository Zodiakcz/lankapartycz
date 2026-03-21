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
  const { amount, description, isShared, paidByUserId } = req.body
  const expense = await prisma.expense.create({
    data: {
      partyId: Number(req.params.partyId),
      paidByUserId: paidByUserId || req.session.userId!,
      amount,
      description,
      isShared: isShared !== undefined ? isShared : true,
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

  // Calculate nights per person
  const nightsPerPerson: Record<number, { user: { id: number; displayName: string }; nights: number }> = {}

  for (const att of attendance) {
    if (!att.arrival || !att.departure) continue
    const arrival = new Date(att.arrival)
    const departure = new Date(att.departure)
    const nights = Math.max(0, Math.ceil((departure.getTime() - arrival.getTime()) / (1000 * 60 * 60 * 24)))
    nightsPerPerson[att.userId] = { user: att.user, nights }
  }

  const totalNights = Object.values(nightsPerPerson).reduce((sum, p) => sum + p.nights, 0)

  // Split shared expenses by nights
  const sharedTotal = expenses.filter(e => e.isShared).reduce((sum, e) => sum + e.amount, 0)
  const personalExpenses = expenses.filter(e => !e.isShared)

  // Per person: what they owe vs what they paid
  const perPerson: Record<number, {
    user: { id: number; displayName: string }
    nights: number
    owes: number
    paid: number
    balance: number
  }> = {}

  for (const [userIdStr, data] of Object.entries(nightsPerPerson)) {
    const userId = Number(userIdStr)
    const share = totalNights > 0 ? (data.nights / totalNights) * sharedTotal : 0
    const paid = expenses.filter(e => e.paidByUserId === userId && e.isShared).reduce((sum, e) => sum + e.amount, 0)

    perPerson[userId] = {
      user: data.user,
      nights: data.nights,
      owes: Math.round(share * 100) / 100,
      paid: Math.round(paid * 100) / 100,
      balance: Math.round((paid - share) * 100) / 100, // positive = others owe them
    }
  }

  res.json({
    sharedTotal: Math.round(sharedTotal * 100) / 100,
    totalNights,
    perPerson: Object.values(perPerson),
    personalExpenses: personalExpenses.map(e => ({
      ...e,
      paidBy: attendance.find(a => a.userId === e.paidByUserId)?.user,
    })),
  })
})

export default router
