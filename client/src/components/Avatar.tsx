// Initials avatar with a stable colour per user, in the spirit of Steam's friends list
const COLORS = [
  'bg-[#4c7aa8]', 'bg-[#5f8f3a]', 'bg-[#8a5aa8]', 'bg-[#b0704a]',
  'bg-[#3f8f8a]', 'bg-[#a8506a]', 'bg-[#6b6fb8]', 'bg-[#8a8a3a]',
]

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export function Avatar({ id, name, className = 'w-6 h-6 text-[10px]', ring = 'ring-2 ring-zinc-900' }: {
  id: number; name: string; className?: string; ring?: string
}) {
  return (
    <span title={name}
      className={`${COLORS[id % COLORS.length]} ${className} ${ring} inline-flex items-center justify-center rounded font-bold text-white/90 select-none shrink-0`}>
      {initials(name)}
    </span>
  )
}

// Overlapping row of avatars, capped with a "+N" tile
export function AvatarStack({ users, max = 6 }: { users: { id: number; displayName: string }[]; max?: number }) {
  if (users.length === 0) return null
  const shown = users.slice(0, max)
  const rest = users.length - shown.length
  return (
    <span className="inline-flex -space-x-1.5" title={users.map(u => u.displayName).join(', ')}>
      {shown.map(u => <Avatar key={u.id} id={u.id} name={u.displayName} />)}
      {rest > 0 && (
        <span className="w-6 h-6 inline-flex items-center justify-center rounded bg-zinc-700 text-[10px] font-bold text-zinc-200 ring-2 ring-zinc-900">
          +{rest}
        </span>
      )}
    </span>
  )
}
