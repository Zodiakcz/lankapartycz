const STATUS_COLORS: Record<string, number> = {
  confirmed: 0x22c55e, // green
  maybe: 0xeab308,     // yellow
  declined: 0xef4444,  // red
}

const STATUS_LABELS: Record<string, string> = {
  confirmed: 'Potvrzeno ✅',
  maybe: 'Možná 🤔',
  declined: 'Neúčastní se ❌',
}

export async function sendWebhook(payload: object): Promise<void> {
  const url = process.env.DISCORD_WEBHOOK_URL
  if (!url) return

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      console.error(`Discord webhook failed: ${res.status} ${res.statusText}`)
    }
  } catch (err) {
    console.error('Discord webhook error:', err)
  }
}

export function notifyNewRegistration(username: string, displayName: string): void {
  sendWebhook({
    embeds: [{
      title: '🆕 Nová registrace čeká na schválení',
      color: 0xf97316, // orange
      fields: [
        { name: 'Uživatel', value: displayName, inline: true },
        { name: 'Login', value: username, inline: true },
      ],
      timestamp: new Date().toISOString(),
    }],
  }).catch(() => {})
}

export function notifyAttendanceChange(displayName: string, partyName: string, status: string): void {
  sendWebhook({
    embeds: [{
      title: '🎮 Změna účasti',
      color: STATUS_COLORS[status] ?? 0x6366f1,
      fields: [
        { name: 'Uživatel', value: displayName, inline: true },
        { name: 'Akce', value: partyName, inline: true },
        { name: 'Status', value: STATUS_LABELS[status] ?? status, inline: true },
      ],
      timestamp: new Date().toISOString(),
    }],
  }).catch(() => {})
}
