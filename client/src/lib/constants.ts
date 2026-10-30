export const SOURCE_OPTIONS = [
  { value: 'steam', label: 'Steam' },
  { value: 'epic', label: 'Epic Games' },
  { value: 'copied', label: 'Lokální kopie' },
  { value: 'web', label: 'Webová hra' },
] as const

export type GameSource = typeof SOURCE_OPTIONS[number]['value']

export const SOURCE_LABELS: Record<string, string> = Object.fromEntries(
  SOURCE_OPTIONS.map(o => [o.value, o.label])
)

export function sourceBadgeClass(source: string): string {
  return source === 'steam' ? 'badge badge-blue' :
    source === 'epic' ? 'badge badge-orange' :
    source === 'copied' ? 'badge badge-yellow' :
    source === 'web' ? 'badge badge-purple' :
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

export function priceBadgeClass(price: number): string {
  return price > 0 ? 'badge badge-yellow' : 'badge badge-green'
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
