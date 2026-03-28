import cron from 'node-cron'
import { PrismaClient } from '@prisma/client'
import { sendWebhook } from './discord'

const prisma = new PrismaClient()

const APP_URL = 'https://lankapp.cloud'
const QR_CODE_URL = 'https://lankapp.cloud/assets/qr_code-CGx-tYHH.jpg'

function daysUntil(date: Date): number {
  const now = new Date()
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function formatDate(date: Date): string {
  return `${date.getDate()}. ${date.getMonth() + 1}. ${date.getFullYear()}`
}

async function sendAdvanceReminder(partyId: number, partyName: string, days: number, advancePerNight: number) {
  const unpaid = await prisma.attendance.findMany({
    where: {
      partyId,
      status: { in: ['confirmed', 'maybe'] },
      advancePaid: false,
    },
    include: { user: { select: { displayName: true } } },
  })

  if (unpaid.length === 0) return

  const names = unpaid.map(a => `• ${a.user.displayName}`).join('\n')

  await sendWebhook({
    embeds: [{
      title: `💰 Připomínka zálohy — ${partyName}`,
      description: `Párty začíná za ${days} dní! Následující účastníci ještě nezaplatili zálohu:`,
      color: 0xf97316,
      fields: [
        { name: 'Nezaplaceno', value: names },
        { name: 'Záloha za noc', value: `${advancePerNight} Kč`, inline: true },
        { name: 'Odkaz', value: `[Otevřít aplikaci](${APP_URL})`, inline: true },
      ],
      image: { url: QR_CODE_URL },
      timestamp: new Date().toISOString(),
    }],
  })
}

async function sendGetReadyReminder(partyId: number, party: { name: string; location: string; startDate: Date; endDate: Date }) {
  const days = daysUntil(party.startDate)
  const confirmedCount = await prisma.attendance.count({
    where: { partyId, status: 'confirmed' },
  })

  await sendWebhook({
    embeds: [{
      title: `🎮 ${party.name} už za ${days} ${days === 1 ? 'den' : days < 5 ? 'dny' : 'dní'}!`,
      color: 0x6366f1,
      fields: [
        { name: 'Místo', value: party.location, inline: true },
        { name: 'Kdy', value: `${formatDate(party.startDate)} — ${formatDate(party.endDate)}`, inline: true },
        { name: 'Potvrzených účastníků', value: `${confirmedCount}`, inline: true },
        { name: 'Odkaz', value: `[Otevřít aplikaci](${APP_URL})` },
      ],
      timestamp: new Date().toISOString(),
    }],
  })
}

async function sendDayOfNotification(partyId: number, party: { name: string; location: string }) {
  const attendees = await prisma.attendance.findMany({
    where: { partyId, status: 'confirmed' },
    include: { user: { select: { displayName: true } } },
  })

  const names = attendees.map(a => a.user.displayName).join(', ') || 'Zatím nikdo 😢'

  await sendWebhook({
    embeds: [{
      title: `🔥 Dnes je to tady — ${party.name}!`,
      description: 'Připravte si věci a hurá na párty!',
      color: 0x22c55e,
      fields: [
        { name: 'Místo', value: party.location, inline: true },
        { name: 'Jedou', value: names },
        { name: 'Odkaz', value: `[Otevřít aplikaci](${APP_URL})` },
      ],
      timestamp: new Date().toISOString(),
    }],
  })
}

async function alreadySent(partyId: number, type: string): Promise<boolean> {
  const existing = await prisma.sentNotification.findUnique({
    where: { partyId_type: { partyId, type } },
  })
  return !!existing
}

async function markSent(partyId: number, type: string): Promise<void> {
  await prisma.sentNotification.create({
    data: { partyId, type },
  })
}

async function checkAndSendNotifications() {
  try {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const parties = await prisma.party.findMany({
      where: { startDate: { gte: today } },
    })

    for (const party of parties) {
      const days = daysUntil(party.startDate)

      if (days <= 10 && days > 3) {
        if (!(await alreadySent(party.id, 'advance_reminder'))) {
          await sendAdvanceReminder(party.id, party.name, days, party.advancePerNight)
          await markSent(party.id, 'advance_reminder')
          console.log(`[Scheduler] Sent advance reminder for "${party.name}"`)
        }
      }

      if (days <= 3 && days > 0) {
        if (!(await alreadySent(party.id, 'get_ready'))) {
          await sendGetReadyReminder(party.id, party)
          await markSent(party.id, 'get_ready')
          console.log(`[Scheduler] Sent get-ready reminder for "${party.name}"`)
        }
      }

      if (days === 0) {
        if (!(await alreadySent(party.id, 'day_of'))) {
          await sendDayOfNotification(party.id, party)
          await markSent(party.id, 'day_of')
          console.log(`[Scheduler] Sent day-of notification for "${party.name}"`)
        }
      }
    }
  } catch (err) {
    console.error('[Scheduler] Error checking notifications:', err)
  }
}

export function startScheduler() {
  // Run daily at 9:00 AM
  cron.schedule('0 9 * * *', checkAndSendNotifications)

  // Catch up on missed notifications 10s after startup
  setTimeout(checkAndSendNotifications, 10_000)

  console.log('[Scheduler] Notification scheduler started (daily at 9:00)')
}
