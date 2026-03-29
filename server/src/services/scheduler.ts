import cron from 'node-cron'
import { sendWebhook } from './discord'
import { prisma } from '../lib/prisma'

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

// --- Schedule item notifications (15 min before + on time) ---

function getScheduleItemDate(partyStart: Date, day: number, time: string): Date {
  const date = new Date(partyStart)
  date.setDate(date.getDate() + day - 1)
  const [hours, minutes] = time.split(':').map(Number)
  date.setHours(hours, minutes, 0, 0)
  return date
}

async function checkScheduleNotifications() {
  try {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // Get parties that are currently running or starting today
    const parties = await prisma.party.findMany({
      where: {
        startDate: { lte: new Date(now.getTime() + 15 * 60 * 1000) },
        endDate: { gte: today },
      },
      include: {
        schedule: true,
      },
    })

    for (const party of parties) {
      for (const item of party.schedule) {
        const itemDate = getScheduleItemDate(party.startDate, item.day, item.time)
        const minutesUntil = Math.round((itemDate.getTime() - now.getTime()) / (1000 * 60))

        // 15 minutes before
        if (minutesUntil >= 0 && minutesUntil <= 15) {
          const type = `schedule_15min_${item.id}`
          if (!(await alreadySent(party.id, type))) {
            await sendWebhook({
              embeds: [{
                title: `⏰ Za 15 minut: ${item.title}`,
                color: 0xeab308,
                fields: [
                  { name: 'Akce', value: party.name, inline: true },
                  { name: 'Čas', value: item.time, inline: true },
                  ...(item.description ? [{ name: 'Popis', value: item.description }] : []),
                  { name: 'Odkaz', value: `[Otevřít aplikaci](${APP_URL})` },
                ],
                timestamp: new Date().toISOString(),
              }],
            })
            await markSent(party.id, type)
            console.log(`[Scheduler] Sent 15min reminder for "${item.title}" at ${party.name}`)
          }
        }

        // On time
        if (minutesUntil >= -2 && minutesUntil <= 0) {
          const type = `schedule_now_${item.id}`
          if (!(await alreadySent(party.id, type))) {
            await sendWebhook({
              embeds: [{
                title: `🎬 Právě začíná: ${item.title}`,
                color: 0x22c55e,
                fields: [
                  { name: 'Akce', value: party.name, inline: true },
                  { name: 'Čas', value: item.time, inline: true },
                  ...(item.description ? [{ name: 'Popis', value: item.description }] : []),
                  { name: 'Odkaz', value: `[Otevřít aplikaci](${APP_URL})` },
                ],
                timestamp: new Date().toISOString(),
              }],
            })
            await markSent(party.id, type)
            console.log(`[Scheduler] Sent on-time notification for "${item.title}" at ${party.name}`)
          }
        }
      }
    }
  } catch (err) {
    console.error('[Scheduler] Error checking schedule notifications:', err)
  }
}

// --- Daily party notifications ---

async function checkDailyNotifications() {
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
    console.error('[Scheduler] Error checking daily notifications:', err)
  }
}

export function startScheduler() {
  // Daily party reminders at 9:00 AM
  cron.schedule('0 9 * * *', checkDailyNotifications)

  // Schedule item alerts every minute
  cron.schedule('* * * * *', checkScheduleNotifications)

  // Catch up on missed notifications 10s after startup
  setTimeout(checkDailyNotifications, 10_000)

  console.log('[Scheduler] Notification scheduler started (daily at 9:00 + per-minute schedule checks)')
}
