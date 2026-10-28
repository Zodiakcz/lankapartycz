export const SOURCE_OPTIONS = [
  { value: 'steam', label: 'Steam' },
  { value: 'epic', label: 'Epic Games' },
  { value: 'copied', label: 'Kopie' },
  { value: 'free', label: 'Free' },
  { value: 'other', label: 'Jiné' },
] as const

export type GameSource = typeof SOURCE_OPTIONS[number]['value']

export const SOURCE_LABELS: Record<string, string> = Object.fromEntries(
  SOURCE_OPTIONS.map(o => [o.value, o.label])
)

export function sourceBadgeClass(source: string): string {
  return source === 'steam' ? 'badge badge-blue' :
    source === 'epic' ? 'badge badge-orange' :
    source === 'copied' ? 'badge badge-yellow' :
    source === 'free' ? 'badge badge-green' :
    'badge badge-gray'
}

export const GAME_TIERS = [
  { value: 'gold', label: 'Zlaté', icon: '🥇', hint: 'Hrajeme vždycky' },
  { value: 'silver', label: 'Stříbrné', icon: '🥈', hint: 'Odhlasované, zkoušíme' },
  { value: 'bronze', label: 'Bronzové', icon: '🥉', hint: 'Návrhy. Hlas = chci to hrát a koupím si to (klidně na poslední chvíli)' },
] as const

export function priceLabel(price: number): string {
  return price > 0 ? `${price} Kč` : 'Zdarma'
}

// Steam store links carry the app id, which is enough to build the header image URL
export function steamHeaderImage(storeUrl: string): string | null {
  const match = storeUrl.match(/store\.steampowered\.com\/app\/(\d+)/)
  return match ? `https://cdn.cloudflare.steamstatic.com/steam/apps/${match[1]}/header.jpg` : null
}

export const PACKING_CATEGORIES: Record<string, string> = {
  hardware: 'Hardware',
  general: 'Obecné',
  food: 'Jídlo & pití',
  other: 'Ostatní',
}

export const PACKING_CATEGORY_ICONS: Record<string, string> = {
  hardware: '🖥️',
  general: '🎒',
  food: '🍕',
  other: '📦',
}
