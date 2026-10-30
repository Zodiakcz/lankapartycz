import { prisma } from '../lib/prisma'

// Finds a picture for a game from its link. Steam apps go through the store API because newer apps
// keep their header under a hashed path that can't be guessed; any other page is read for og:image.

const TIMEOUT_MS = 5000

async function steamHeader(appId: string): Promise<string> {
  const res = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}&filters=basic`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!res.ok) return ''
  const body = await res.json() as Record<string, { success: boolean; data?: { header_image?: string } }>
  return body[appId]?.data?.header_image ?? ''
}

// Members type these links, so the server only fetches public hostnames, never the home LAN
function isPublicHost(hostname: string): boolean {
  return hostname.includes('.') && !/^[\d.]+$/.test(hostname) && !hostname.startsWith('[') && !hostname.endsWith('.local')
}

async function ogImage(pageUrl: URL): Promise<string> {
  if (!isPublicHost(pageUrl.hostname)) return ''
  const res = await fetch(pageUrl, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; lankapp)', 'Accept-Language': 'cs,en' },
  })
  if (!res.ok || !res.headers.get('content-type')?.includes('text/html')) return ''
  const html = (await res.text()).slice(0, 500_000)
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    if (!/(property|name)\s*=\s*["'](og:image|og:image:url|twitter:image)["']/i.test(tag)) continue
    const content = tag.match(/content\s*=\s*["']([^"']+)["']/i)?.[1]
    if (!content) continue
    const src = new URL(content.replace(/&amp;/g, '&'), pageUrl)
    if (src.protocol === 'https:' || src.protocol === 'http:') return src.href
  }
  return ''
}

// Never throws: a link without a findable picture just gets the placeholder tile
export async function resolveGameImage(storeUrl: string): Promise<string> {
  if (!storeUrl) return ''
  try {
    const url = new URL(storeUrl)
    const steamApp = url.hostname.endsWith('steampowered.com') && url.pathname.match(/^\/app\/(\d+)/)
    return steamApp ? await steamHeader(steamApp[1]) : await ogImage(url)
  } catch {
    return ''
  }
}

// Fills pictures for games saved before lookups existed; ones that find nothing retry on the next start
export async function backfillGameImages(): Promise<void> {
  const games = await prisma.game.findMany({ where: { imageUrl: '', storeUrl: { not: '' } } })
  let found = 0
  for (const game of games) {
    const imageUrl = await resolveGameImage(game.storeUrl)
    if (!imageUrl) continue
    await prisma.game.update({ where: { id: game.id }, data: { imageUrl } })
    found++
  }
  if (games.length) console.log(`Obrázky her: doplněno ${found} z ${games.length}`)
}
