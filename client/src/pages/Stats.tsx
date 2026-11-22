import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { api } from '../lib/api'
import type { PartyStats } from '../lib/types'
import { StatsTabs } from '../components/StatsTabs'

// Tailwind's zinc/indigo are redefined to the Steam palette (tailwind.config.js); SVG needs raw hex.
// Series pair validated (dataviz validator, dark, card surface #1e2a37): indigo-600 + amber-600
const C_PRIMARY = '#2a7fb8'
const C_SECOND = '#d97706'
const SURFACE = '#1e2a37' // zinc-900, card
const GRID = '#2a3b4d' // zinc-800
const CROSSHAIR = '#536170' // zinc-600
const AXIS_TEXT = '#6d7b88' // zinc-500
const LABEL_TEXT = '#c6d4df' // zinc-200

const czk = (n: number) => `${Math.round(n).toLocaleString('cs-CZ')} Kč`
const num = (n: number) => n.toLocaleString('cs-CZ')
const shortDate = (iso: string) => {
  const d = new Date(iso)
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(2)}`
}
const longDate = (iso: string) => new Date(iso).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' })

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}

/** Clean tick step: 1, 2, 5 × 10^n */
function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0, 1]
  const raw = max / count
  const pow = Math.pow(10, Math.floor(Math.log10(raw)))
  const step = [1, 2, 5, 10].map(m => m * pow).find(s => s >= raw) ?? raw
  const ticks: number[] = []
  for (let v = 0; v <= max + step * 0.001; v += step) ticks.push(v)
  if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step)
  return ticks
}

const tickLabel = (v: number, top: number) =>
  top >= 10000 ? `${(v / 1000).toLocaleString('cs-CZ')}K` : v.toLocaleString('cs-CZ')

/** Path for a column with 4px rounded top, square bottom */
function columnPath(x: number, y: number, w: number, h: number, r = 4) {
  if (h <= 0) return ''
  const rr = Math.min(r, h, w / 2)
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`
}

interface Series {
  key: string
  label: string
  color: string
  value: (p: PartyStats) => number | null
}

interface ChartProps {
  parties: PartyStats[]
  series: Series[]
  kind: 'column' | 'stack' | 'line'
  format: (n: number) => string
  /** value printed on cap / line end; defaults to sum of series */
  total?: (p: PartyStats) => number | null
}

const H = 220
const M = { top: 22, right: 12, bottom: 28, left: 44 }

function Chart({ parties, series, kind, format, total }: ChartProps) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)

  const totalOf = total ?? ((p: PartyStats) => series.reduce((s, ser) => s + (ser.value(p) ?? 0), 0))
  const values = parties.map(totalOf)
  const max = Math.max(0, ...values.map(v => v ?? 0))
  const ticks = niceTicks(max)
  const top = ticks[ticks.length - 1]

  const innerW = Math.max(0, width - M.left - M.right)
  const innerH = H - M.top - M.bottom
  const band = parties.length > 0 ? innerW / parties.length : 0
  const barW = Math.min(24, band * 0.6)
  const y = (v: number) => M.top + innerH - (top > 0 ? (v / top) * innerH : 0)
  const cx = (i: number) => M.left + band * i + band / 2

  // Show every k-th x label so they don't collide (~44px per label)
  const labelEvery = Math.max(1, Math.ceil(44 / Math.max(band, 1)))

  // Line: only points with a value
  const linePts = values
    .map((v, i) => (v == null ? null : { x: cx(i), y: y(v), i }))
    .filter((p): p is { x: number; y: number; i: number } => p !== null)

  // Direct label: max value (column/stack) or last value (line)
  let labelIdx = -1
  // (upcoming parties are faded and incomplete, so they never carry the label)
  const labelPts = linePts.filter(pt => !parties[pt.i].upcoming)
  if (kind === 'line') labelIdx = labelPts.length ? labelPts[labelPts.length - 1].i : -1
  else values.forEach((v, i) => { if (v != null && !parties[i].upcoming && (labelIdx < 0 || v > (values[labelIdx] ?? 0))) labelIdx = i })

  const hovered = hover != null ? parties[hover] : null

  return (
    <div ref={ref} className="relative" onMouseLeave={() => setHover(null)}>
      {width > 0 && (
        <svg width={width} height={H} className="block select-none">
          {/* grid + y ticks */}
          {ticks.map(t => (
            <g key={t}>
              <line x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
              <text x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill={AXIS_TEXT}>
                {tickLabel(t, top)}
              </text>
            </g>
          ))}

          {/* x labels */}
          {parties.map((p, i) =>
            i % labelEvery === 0 || i === parties.length - 1 ? (
              <text key={p.id} x={cx(i)} y={H - 8} textAnchor="middle" fontSize={11} fill={hover === i ? LABEL_TEXT : AXIS_TEXT}>
                {shortDate(p.startDate)}
              </text>
            ) : null,
          )}

          {/* hover crosshair (line) / band highlight (columns) */}
          {hover != null && kind === 'line' && (
            <line x1={cx(hover)} x2={cx(hover)} y1={M.top} y2={M.top + innerH} stroke={CROSSHAIR} strokeWidth={1} />
          )}
          {hover != null && kind !== 'line' && (
            <rect x={M.left + band * hover} y={M.top} width={band} height={innerH} fill="#ffffff" opacity={0.03} />
          )}

          {/* marks */}
          {kind !== 'line' &&
            parties.map((p, i) => {
              const x = cx(i) - barW / 2
              let base = 0
              const segs = series.map((s, si) => {
                const v = s.value(p) ?? 0
                if (v <= 0) return null
                const y0 = y(base)
                const y1 = y(base + v)
                base += v
                const isTop = series.slice(si + 1).every(n => (n.value(p) ?? 0) <= 0)
                // 2px surface gap between stacked segments
                const gap = si > 0 && kind === 'stack' ? 2 : 0
                const h = y0 - y1 - gap
                return isTop ? (
                  <path key={s.key} d={columnPath(x, y1, barW, h)} fill={s.color} />
                ) : (
                  <rect key={s.key} x={x} y={y1} width={barW} height={Math.max(0, h)} fill={s.color} />
                )
              })
              return (
                <g key={p.id} opacity={p.upcoming ? 0.35 : 1}>
                  {segs}
                </g>
              )
            })}

          {kind === 'line' && linePts.length > 0 && (
            <>
              <path
                d={`M${linePts[0].x},${M.top + innerH} ${linePts.map(pt => `L${pt.x},${pt.y}`).join(' ')} L${linePts[linePts.length - 1].x},${M.top + innerH} Z`}
                fill={series[0].color}
                opacity={0.1}
              />
              <polyline
                points={linePts.map(pt => `${pt.x},${pt.y}`).join(' ')}
                fill="none"
                stroke={series[0].color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {linePts.map(pt => (
                <circle
                  key={pt.i}
                  cx={pt.x}
                  cy={pt.y}
                  r={hover === pt.i ? 5 : 4}
                  fill={series[0].color}
                  stroke={SURFACE}
                  strokeWidth={2}
                  opacity={parties[pt.i].upcoming ? 0.35 : 1}
                />
              ))}
            </>
          )}

          {/* single direct label */}
          {labelIdx >= 0 && values[labelIdx] != null && hover == null && (
            <text
              x={cx(labelIdx)}
              y={y(values[labelIdx]!) - 8}
              textAnchor="middle"
              fontSize={11}
              fontWeight={600}
              fill={LABEL_TEXT}
            >
              {format(values[labelIdx]!)}
            </text>
          )}

          {/* hit targets: full band */}
          {parties.map((p, i) => (
            <rect
              key={p.id}
              x={M.left + band * i}
              y={M.top}
              width={band}
              height={innerH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onTouchStart={() => setHover(i)}
            />
          ))}
        </svg>
      )}

      {hovered && hover != null && (
        <div
          className="absolute pointer-events-none z-10 bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-xs shadow-xl w-[170px]"
          style={
            // beside the hovered column, flipped to the left near the right edge
            cx(hover) + 16 + 170 <= width
              ? { top: M.top, left: cx(hover) + 16 }
              : { top: M.top, left: Math.max(0, cx(hover) - 16 - 170) }
          }
        >
          <div className="font-semibold text-zinc-100">{hovered.name}</div>
          <div className="text-zinc-500 mb-1">
            {longDate(hovered.startDate)}
            {hovered.upcoming && ' · plánovaná'}
          </div>
          {series.map(s => {
            const v = s.value(hovered)
            return (
              <div key={s.key} className="flex items-center gap-2 text-zinc-300">
                <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: s.color }} />
                <span className="flex-1">{s.label}</span>
                <span className="font-medium text-zinc-100">{v == null ? '–' : format(v)}</span>
              </div>
            )
          })}
          {series.length > 1 && (
            <div className="flex justify-between border-t border-white/10 mt-1 pt-1 text-zinc-300">
              <span>Celkem</span>
              <span className="font-semibold text-zinc-100">{format(totalOf(hovered) ?? 0)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ChartCard({ title, subtitle, legend, children }: {
  title: string
  subtitle?: string
  legend?: Series[]
  children: React.ReactNode
}) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div>
          <h2 className="font-semibold text-zinc-100">{title}</h2>
          {subtitle && <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>}
        </div>
        {legend && (
          <div className="flex items-center gap-3 text-xs text-zinc-400">
            {legend.map(s => (
              <span key={s.key} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: s.color }} />
                {s.label}
              </span>
            ))}
          </div>
        )}
      </div>
      {children}
    </div>
  )
}

function Kpi({ value, label }: { value: string; label: string }) {
  return (
    <div className="card p-4">
      <div className="text-xl sm:text-2xl font-bold text-zinc-100 tabular-nums">{value}</div>
      <div className="text-xs text-zinc-500 mt-1">{label}</div>
    </div>
  )
}

const S_ATTENDEES: Series = { key: 'att', label: 'Účastníci', color: C_PRIMARY, value: p => p.attendees }
const S_NIGHTS: Series = { key: 'nights', label: 'Osobonoci', color: C_PRIMARY, value: p => p.totalNights }
const S_PER_NIGHT: Series = { key: 'ppn', label: 'Cena za osobonoc', color: C_PRIMARY, value: p => p.costPerNight }
const S_EXPENSES: Series = { key: 'exp', label: 'Nákupy', color: C_PRIMARY, value: p => p.expensesTotal }
const S_STAY: Series = { key: 'stay', label: 'Ubytování', color: C_SECOND, value: p => p.stayCost }

export function Stats() {
  const [parties, setParties] = useState<PartyStats[] | null>(null)
  const [error, setError] = useState('')
  const [showUpcoming, setShowUpcoming] = useState(true)

  useEffect(() => {
    api.stats().then(d => setParties(d.parties)).catch(e => setError(e.message))
  }, [])

  if (error) return <div className="text-red-400">{error}</div>
  if (!parties) return <div className="text-zinc-500">Načítání...</div>

  const past = parties.filter(p => !p.upcoming)
  const hasUpcoming = parties.some(p => p.upcoming)
  const shown = showUpcoming ? parties : past

  const sumNights = past.reduce((s, p) => s + p.totalNights, 0)
  const sumCost = past.reduce((s, p) => s + p.totalCost, 0)
  const avgAttendees = past.length ? past.reduce((s, p) => s + p.attendees, 0) / past.length : 0

  return (
    <div className="space-y-6">
      <StatsTabs />
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <h1 className="page-heading">Statistiky</h1>
        {hasUpcoming && (
          <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
            <input
              type="checkbox"
              checked={showUpcoming}
              onChange={e => setShowUpcoming(e.target.checked)}
              className="accent-indigo-500"
            />
            Zobrazit plánované akce
          </label>
        )}
      </div>

      {parties.length === 0 ? (
        <div className="card p-8 text-center text-zinc-500">Zatím žádné akce.</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi value={num(past.length)} label="proběhlých akcí" />
            <Kpi value={num(sumNights)} label="osobonocí celkem" />
            <Kpi value={czk(sumCost)} label="utraceno celkem" />
            <Kpi value={sumNights > 0 ? czk(sumCost / sumNights) : '–'} label="průměrně za osobonoc" />
          </div>
          {past.length > 0 && (
            <p className="text-xs text-zinc-500 -mt-3">
              Průměrná účast {avgAttendees.toLocaleString('cs-CZ', { maximumFractionDigits: 1 })} lidí. Souhrn počítá jen proběhlé akce
              {hasUpcoming && showUpcoming ? ', plánované jsou v grafech vybledlé' : ''}.
            </p>
          )}

          <div className="grid lg:grid-cols-2 gap-4">
            <ChartCard title="Účast" subtitle="Potvrzení účastníci na akci">
              <Chart parties={shown} series={[S_ATTENDEES]} kind="column" format={num} />
            </ChartCard>
            <ChartCard title="Noci celkem" subtitle="Součet nocí všech účastníků">
              <Chart parties={shown} series={[S_NIGHTS]} kind="column" format={num} />
            </ChartCard>
            <ChartCard title="Celkové náklady" subtitle="Nákupy a ubytování za akci" legend={[S_EXPENSES, S_STAY]}>
              <Chart parties={shown} series={[S_EXPENSES, S_STAY]} kind="stack" format={czk} />
            </ChartCard>
            <ChartCard title="Cena za osobonoc" subtitle="Celkové náklady / noci celkem">
              <Chart parties={shown} series={[S_PER_NIGHT]} kind="line" format={czk} total={p => p.costPerNight} />
            </ChartCard>
          </div>

          <details className="card">
            <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-zinc-300 hover:text-zinc-100">
              Tabulka hodnot
            </summary>
            <div className="overflow-x-auto border-t border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-zinc-500 text-right">
                    <th className="text-left font-medium px-4 py-2">Akce</th>
                    <th className="font-medium px-3 py-2">Účast</th>
                    <th className="font-medium px-3 py-2">Noci</th>
                    <th className="font-medium px-3 py-2">Nákupy</th>
                    <th className="font-medium px-3 py-2">Ubytování</th>
                    <th className="font-medium px-3 py-2">Celkem</th>
                    <th className="font-medium px-4 py-2">Za noc</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {[...shown].reverse().map(p => (
                    <tr key={p.id} className={`border-t border-white/5 text-right text-zinc-300 ${p.upcoming ? 'opacity-50' : ''}`}>
                      <td className="text-left px-4 py-2 whitespace-nowrap">
                        <div className="text-zinc-100">{p.name}</div>
                        <div className="text-xs text-zinc-500">{longDate(p.startDate)}{p.upcoming && ' · plánovaná'}</div>
                      </td>
                      <td className="px-3 py-2">{p.attendees}</td>
                      <td className="px-3 py-2">{p.totalNights}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{czk(p.expensesTotal)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{czk(p.stayCost)}</td>
                      <td className="px-3 py-2 whitespace-nowrap font-medium text-zinc-100">{czk(p.totalCost)}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{p.costPerNight == null ? '–' : czk(p.costPerNight)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </div>
  )
}
