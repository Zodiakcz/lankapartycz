import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAuth, requireAdmin } from '../middleware/auth'
import { countNights } from '../utils'

const router = Router()
const prisma = new PrismaClient()

const FOOD_CATEGORIES = [
  { key: 'hotova_jidla', label: 'Hotová jídla', defaultUnit: 'ks' },
  { key: 'piti', label: 'Pití (za noc)', defaultUnit: 'l' },
  { key: 'sunky', label: 'Šunky (za noc)', defaultUnit: 'baleni' },
  { key: 'syry', label: 'Sýry', defaultUnit: 'baleni' },
  { key: 'zelenina', label: 'Zelenina', defaultUnit: 'ks' },
  { key: 'parky', label: 'Párky', defaultUnit: 'ks' },
  { key: 'toustovy_chleb', label: 'Toastový chléb', defaultUnit: 'baleni' },
]

// Get food categories definition
router.get('/categories', requireAuth, (_req, res) => {
  res.json(FOOD_CATEGORIES)
})

// Get food estimates for a party
router.get('/:partyId/food', requireAuth, async (req, res) => {
  const partyId = Number(req.params.partyId)
  const estimates = await prisma.foodEstimate.findMany({ where: { partyId } })
  res.json(estimates)
})

// Set/update food estimate for a category (admin)
router.post('/:partyId/food', requireAdmin, async (req, res) => {
  const partyId = Number(req.params.partyId)
  const { category, perNight, unit } = req.body

  const estimate = await prisma.foodEstimate.upsert({
    where: { partyId_category: { partyId, category } },
    update: { perNight, ...(unit && { unit }) },
    create: { partyId, category, perNight, unit: unit || 'ks' },
  })
  res.json(estimate)
})

// Calculate food amounts for a party
router.get('/:partyId/food/calculate', requireAuth, async (req, res) => {
  const partyId = Number(req.params.partyId)

  const [estimates, attendance] = await Promise.all([
    prisma.foodEstimate.findMany({ where: { partyId } }),
    prisma.attendance.findMany({
      where: { partyId, status: 'confirmed' },
      include: { user: { select: { id: true, displayName: true } } },
    }),
  ])

  // Calculate total person-nights
  let totalNights = 0
  const perPerson: { user: { id: number; displayName: string }; nights: number }[] = []

  for (const att of attendance) {
    if (!att.arrival || !att.departure) continue
    const nights = countNights(new Date(att.arrival), new Date(att.departure))
    totalNights += nights
    perPerson.push({ user: att.user, nights })
  }

  // Calculate amounts per category
  const amounts = estimates.map(est => {
    const cat = FOOD_CATEGORIES.find(c => c.key === est.category)
    return {
      category: est.category,
      label: cat?.label || est.category,
      perNight: est.perNight,
      unit: est.unit,
      totalNeeded: Math.ceil(est.perNight * totalNights * 10) / 10,
    }
  })

  res.json({
    totalNights,
    confirmedPeople: perPerson.length,
    perPerson,
    amounts,
  })
})

// Toggle food estimate purchased status (any user)
router.patch('/:partyId/food/:category/toggle', requireAuth, async (req, res) => {
  const partyId = Number(req.params.partyId)
  const category = String(req.params.category)

  const est = await prisma.foodEstimate.findUnique({
    where: { partyId_category: { partyId, category } },
  })
  if (!est) return res.status(404).json({ error: 'Kategorie nenalezena' })

  const updated = await prisma.foodEstimate.update({
    where: { id: est.id },
    data: { purchased: !est.purchased },
  })
  res.json(updated)
})

// Copy food estimates and shopping items from another party (admin)
router.post('/:partyId/copy-from/:sourcePartyId', requireAdmin, async (req, res) => {
  const partyId = Number(req.params.partyId)
  const sourcePartyId = Number(req.params.sourcePartyId)

  const [sourceEstimates, sourceItems] = await Promise.all([
    prisma.foodEstimate.findMany({ where: { partyId: sourcePartyId } }),
    prisma.shoppingItem.findMany({ where: { partyId: sourcePartyId } }),
  ])

  // Upsert food estimates (overwrite existing, add missing)
  for (const est of sourceEstimates) {
    await prisma.foodEstimate.upsert({
      where: { partyId_category: { partyId, category: est.category } },
      update: { perNight: est.perNight, unit: est.unit, purchased: false },
      create: { partyId, category: est.category, perNight: est.perNight, unit: est.unit },
    })
  }

  // Copy shopping items (skip duplicates by name)
  const existingItems = await prisma.shoppingItem.findMany({ where: { partyId } })
  const existingNames = new Set(existingItems.map(i => i.name.toLowerCase()))

  for (const item of sourceItems) {
    if (!existingNames.has(item.name.toLowerCase())) {
      await prisma.shoppingItem.create({
        data: { partyId, name: item.name },
      })
    }
  }

  res.json({ ok: true, copiedEstimates: sourceEstimates.length, copiedItems: sourceItems.length })
})

// Get shopping items for a party
router.get('/:partyId/items', requireAuth, async (req, res) => {
  const items = await prisma.shoppingItem.findMany({
    where: { partyId: Number(req.params.partyId) },
    orderBy: [{ checked: 'asc' }, { createdAt: 'desc' }],
  })
  res.json(items)
})

// Add shopping item (any user)
router.post('/:partyId/items', requireAuth, async (req, res) => {
  const { name } = req.body
  if (!name) return res.status(400).json({ error: 'Zadejte název' })

  const item = await prisma.shoppingItem.create({
    data: { partyId: Number(req.params.partyId), name },
  })
  res.json(item)
})

// Toggle shopping item checked (any user)
router.patch('/:partyId/items/:id', requireAuth, async (req, res) => {
  const item = await prisma.shoppingItem.findUnique({ where: { id: Number(req.params.id) } })
  if (!item) return res.status(404).json({ error: 'Položka nenalezena' })

  const updated = await prisma.shoppingItem.update({
    where: { id: item.id },
    data: { checked: !item.checked },
  })
  res.json(updated)
})

// Delete shopping item
router.delete('/:partyId/items/:id', requireAuth, async (req, res) => {
  await prisma.shoppingItem.delete({ where: { id: Number(req.params.id) } })
  res.json({ ok: true })
})

export default router
