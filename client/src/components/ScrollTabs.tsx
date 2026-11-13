import { useEffect, useRef, useState } from 'react'

// Horizontal tab bar that keeps the active tab in view and fades the edge
// when more tabs are hidden off-screen (phones)
export function ScrollTabs<T extends string>({ tabs, active, onSelect }: {
  tabs: readonly { key: T; label: string }[]; active: T; onSelect: (key: T) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [more, setMore] = useState({ left: false, right: false })

  const measure = () => {
    const el = ref.current
    if (!el) return
    setMore({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 })
  }

  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('[data-active="true"]')
      ?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
    measure()
  }, [active])

  useEffect(() => {
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  return (
    <div className="relative">
      <div ref={ref} onScroll={measure} className="tab-bar">
        {tabs.map(t => (
          <button key={t.key} data-active={t.key === active} onClick={() => onSelect(t.key)}
            className={`tab-item ${t.key === active ? 'tab-active' : 'tab-inactive'}`}>
            {t.label}
          </button>
        ))}
      </div>
      {more.left && <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-chrome to-transparent" />}
      {more.right && <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-chrome to-transparent" />}
    </div>
  )
}
