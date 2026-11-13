import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

// Small dropdown: closes on outside click, Escape, or picking an item
export function Menu({ trigger, label, children, buttonClassName = '' }: {
  trigger: React.ReactNode; label: string; children: React.ReactNode; buttonClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button type="button" aria-label={label} aria-haspopup="menu" aria-expanded={open}
        onClick={() => setOpen(o => !o)} className={buttonClassName}>
        {trigger}
      </button>
      {open && (
        <div role="menu" onClick={() => setOpen(false)}
          className="absolute right-0 mt-1 min-w-[190px] z-50 rounded-lg bg-zinc-800 border border-black/40 shadow-xl shadow-black/50 py-1">
          {children}
        </div>
      )}
    </div>
  )
}

const itemClass = (danger?: boolean) =>
  `block w-full text-left px-3 py-2 text-sm transition-colors ${danger ? 'text-red-400 hover:bg-red-900/30' : 'text-zinc-200 hover:bg-indigo-600 hover:text-white'}`

export function MenuItem({ onClick, to, danger, children }: {
  onClick?: () => void; to?: string; danger?: boolean; children: React.ReactNode
}) {
  if (to) return <Link role="menuitem" to={to} className={itemClass(danger)}>{children}</Link>
  return <button role="menuitem" type="button" onClick={onClick} className={itemClass(danger)}>{children}</button>
}
