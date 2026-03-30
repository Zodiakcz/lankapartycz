import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { countNights } from '../utils'
import { prisma } from '../lib/prisma'

const router = Router()

router.get('/', requireAuth, async (_req, res) => {
  const [users, attendance, expenses, parties] = await Promise.all([
    prisma.user.findMany({
      where: { approved: true },
      select: { id: true, displayName: true },
    }),
    prisma.attendance.findMany({
      where: { status: 'confirmed' },
      include: { party: { select: { id: true } } },
    }),
    prisma.expense.findMany({
      select: { paidByUserId: true, amount: true, partyId: true },
    }),
    prisma.party.count(),
  ])

  const stats = users.map(user => {
    const userAttendance = attendance.filter(a => a.userId === user.id)
    const eventsAttended = new Set(userAttendance.map(a => a.partyId)).size

    let totalNights = 0
    for (const att of userAttendance) {
      if (att.arrival && att.departure) {
        totalNights += countNights(new Date(att.arrival), new Date(att.departure))
      }
    }

    const userExpenses = expenses.filter(e => e.paidByUserId === user.id)
    const totalSpent = userExpenses.reduce((sum, e) => sum + e.amount, 0)
    const eventsSupplied = new Set(userExpenses.map(e => e.partyId)).size

    return {
      user: { id: user.id, displayName: user.displayName },
      eventsAttended,
      totalNights,
      totalSpent: Math.round(totalSpent * 100) / 100,
      eventsSupplied,
    }
  })

  // Sort by events attended desc, then nights desc
  stats.sort((a, b) => b.eventsAttended - a.eventsAttended || b.totalNights - a.totalNights)

  res.json({ stats, totalParties: parties })
})

export default router
