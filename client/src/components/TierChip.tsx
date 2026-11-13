import type { GameTier } from '../lib/types'

// Full class names: Tailwind only emits component classes it finds as literal strings
const TIER_CLASS: Record<GameTier, string> = {
  gold: 'tier-gold',
  silver: 'tier-silver',
  bronze: 'tier-bronze',
}

// Metallic gold/silver/bronze chip; replaces the medal emoji, which render differently per OS
export function TierChip({ tier, children, className = '' }: { tier: GameTier; children: React.ReactNode; className?: string }) {
  return <span className={`tier-chip ${TIER_CLASS[tier]} ${className}`}>{children}</span>
}

const PODIUM: GameTier[] = ['gold', 'silver', 'bronze']

// Rank 0-2 as a round metallic medal with the number, later ranks as plain numbers
export function RankMedal({ rank }: { rank: number }) {
  const tier = PODIUM[rank]
  if (!tier) return <span className="text-sm font-semibold text-zinc-500 tabular-nums">{rank + 1}.</span>
  return (
    <TierChip tier={tier} className="!rounded-full w-7 h-7 !px-0 !text-xs">
      {rank + 1}
    </TierChip>
  )
}
