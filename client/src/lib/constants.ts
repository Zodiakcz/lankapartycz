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
