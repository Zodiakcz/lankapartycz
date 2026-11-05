import { useMemo, useState } from 'react'
import type { Party } from '../lib/types'
import {
  partyWindow, stays, tally, presentOnDay, presentOnNight, nightsOf, nowFloating,
  dayStart, fmtDayTime, fmtWeekday, fmtDate, fmtTally, onWeekday, nights, DAY,
} from '../lib/presence'

const MAYBE_BG = 'repeating-linear-gradient(135deg, rgba(99,102,241,.38) 0 6px, rgba(99,102,241,.14) 6px 12px)'
const SHADE = 'rgba(255,255,255,.018)'
const ROW = 'grid grid-cols-[4.25rem_1fr] sm:grid-cols-[7rem_1fr]'

/** Day dividers plus night shading (22:00 to 8:00), drawn on the same scale as the bars. */
function trackBackground(days: number) {
  const total = days * 24
  const pct = (h: number) => `${(Math.min(total, Math.max(0, h)) / total) * 100}%`
  const stops: string[] = []
  for (let k = 0; k <= days; k++) {
    const a = pct(k * 24 - 2), b = pct(k * 24 + 8)
    stops.push(`transparent ${a}`, `${SHADE} ${a}`, `${SHADE} ${b}`, `transparent ${b}`)
  }
  return {
    backgroundImage: `linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(90deg, ${stops.join(', ')})`,
    backgroundSize: `${100 / days}% 100%, 100% 100%`,
  }
}

export function PresenceTimeline({ party, currentUserId }: { party: Party; currentUserId?: number }) {
  const w = useMemo(() => partyWindow(party), [party.startDate, party.endDate])
  const list = useMemo(() => stays(party.attendance ?? [], w), [party.attendance, w])
  const [selected, setSelected] = useState<number | null>(null)

  if (list.length === 0) return null

  const span = w.end - w.start
  const pos = (t: number) => ((t - w.start) / span) * 100
  const dayIdx = Array.from({ length: w.days }, (_, i) => i)
  const dayTallies = dayIdx.map(d => tally(presentOnDay(list, w, d)))
  const totals = dayTallies.map(t => t.sure + t.maybe)
  const max = Math.max(...totals)
  const peak = totals.indexOf(max)
  const now = nowFloating()
  const showNow = now > w.start && now < w.end
  const bg = trackBackground(w.days)
  const declined = (party.attendance ?? []).filter(a => a.status === 'declined')
  const sel = list.find(s => s.att.userId === selected)
  const wide = w.days > 5 // long parties scroll sideways on a phone instead of squashing

  return (
    <div className="card p-4 mb-3">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="font-semibold">Kdo je kdy</h3>
        {w.days > 1 && max > 0 && (
          <span className="badge badge-blue">nejvíc {onWeekday(dayStart(w, peak))} · {fmtTally(dayTallies[peak])}</span>
        )}
      </div>

      <div className="overflow-x-auto">
        <div className="tabular-nums space-y-1.5" style={wide ? { minWidth: `${w.days * 3.5 + 5}rem` } : undefined}>
          {/* Day header */}
          <div className={ROW}>
            <div />
            <div className="grid" style={{ gridTemplateColumns: `repeat(${w.days}, 1fr)` }}>
              {dayIdx.map(d => (
                <div key={d} className="border-l border-white/10 pl-1.5 pb-1 text-xs text-zinc-400 whitespace-nowrap overflow-hidden">
                  <span className="font-semibold text-zinc-100 capitalize">{fmtWeekday(dayStart(w, d))}</span>
                  <span className="hidden sm:inline ml-1">{fmtDate(dayStart(w, d))}</span>
                </div>
              ))}
            </div>
          </div>

          {/* One row per person */}
          {list.map(s => {
            const isSel = s.att.userId === selected
            const label = s.noDates ? 'bez termínu' : `${fmtDayTime(s.from)} → ${fmtDayTime(s.to)}`
            const barClass = s.noDates
              ? 'border border-dashed border-zinc-500 text-zinc-500'
              : s.maybe
                ? 'border border-dashed border-indigo-400 text-indigo-100'
                : 'bg-indigo-500 text-white'
            return (
              <button key={s.att.userId} type="button" onClick={() => setSelected(isSel ? null : s.att.userId)}
                aria-label={`${s.att.user.displayName}: ${label}`} aria-pressed={isSel}
                className={`${ROW} w-full text-left group rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500`}>
                <span className={`text-sm truncate pr-2 self-center ${isSel ? 'text-indigo-400 font-semibold' : 'text-zinc-200'}`}>
                  {s.att.user.displayName}
                  {s.att.userId === currentUserId && <span className="ml-1 text-[10px] text-indigo-400">ty</span>}
                </span>
                <span className="relative block h-7" style={bg}>
                  <span
                    className={`absolute inset-y-1 rounded-md flex items-center px-2 text-[11px] font-medium whitespace-nowrap overflow-hidden transition
                      group-hover:brightness-110 ${isSel ? 'ring-2 ring-indigo-400/60' : ''} ${barClass}`}
                    style={{ left: `${pos(s.from)}%`, width: `max(${pos(s.to) - pos(s.from)}%, 4px)`, ...(s.maybe && !s.noDates ? { backgroundImage: MAYBE_BG } : {}) }}>
                    <span className="hidden sm:inline">{label}</span>
                  </span>
                  {showNow && <span className="absolute inset-y-0 w-px bg-indigo-300/70" style={{ left: `${pos(now)}%` }} />}
                </span>
              </button>
            )
          })}

          {/* People per day */}
          <div className={`${ROW} border-t border-white/10 pt-2.5`}>
            <span className="text-[11px] uppercase tracking-wider text-zinc-500 self-end pb-0.5">lidí</span>
            <div className="grid" style={{ gridTemplateColumns: `repeat(${w.days}, 1fr)` }}>
              {dayIdx.map(d => (
                <div key={d} className="flex flex-col items-center gap-1">
                  <div className="w-3/5 h-8 flex items-end">
                    <div className={`w-full rounded-t ${d === peak ? 'bg-indigo-500' : 'bg-zinc-700/70'}`}
                      style={{ height: max ? `${(totals[d] / max) * 100}%` : 0 }} />
                  </div>
                  <span className={`text-base font-bold ${d === peak ? 'text-indigo-400' : ''}`}>
                    {dayTallies[d].sure}
                    {dayTallies[d].maybe > 0 && <small className="ml-0.5 text-[11px] font-medium text-zinc-400">+{dayTallies[d].maybe}?</small>}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* People per night, centred on each midnight */}
          {w.days > 1 && (
            <div className={ROW}>
              <span className="text-[11px] uppercase tracking-wider text-zinc-500 self-center">nocí</span>
              <div className="relative h-6">
                {dayIdx.slice(0, -1).map(d => (
                  <span key={d} className="absolute top-0.5 -translate-x-1/2 text-[11px] text-zinc-400 bg-zinc-900 border border-white/10 rounded-full px-2 py-0.5 whitespace-nowrap"
                    style={{ left: `${((d + 1) * DAY / span) * 100}%` }}>
                    <span className="hidden sm:inline">noc </span><b className="text-zinc-100">{fmtTally(tally(presentOnNight(list, w, d)))}</b>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 px-3 py-2 rounded-lg bg-zinc-800/60 text-sm text-zinc-400 min-h-10 flex flex-wrap items-center gap-x-4 gap-y-1" aria-live="polite">
        {sel ? (
          <>
            <b className="text-zinc-100">{sel.att.user.displayName}</b>
            {sel.noDates
              ? <span>termín nevyplněn, počítáme celou akci</span>
              : <>
                  <span>příjezd {sel.att.arrival ? fmtDayTime(sel.from) : 'nevyplněn'}</span>
                  <span>odjezd {sel.att.departure ? fmtDayTime(sel.to) : 'nevyplněn'}</span>
                  <span>{nightsOf(sel, w)} {nights(nightsOf(sel, w))}</span>
                </>}
            {sel.maybe && <span className="text-amber-400">zatím možná</span>}
          </>
        ) : <span>Klepni na řádek pro přesné časy.</span>}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 text-xs text-zinc-500">
        <span className="inline-flex items-center gap-1.5"><i className="w-5 h-2.5 rounded-sm bg-indigo-500" />jede</span>
        <span className="inline-flex items-center gap-1.5"><i className="w-5 h-2.5 rounded-sm border border-dashed border-indigo-400" style={{ backgroundImage: MAYBE_BG }} />možná</span>
        <span className="inline-flex items-center gap-1.5"><i className="w-5 h-2.5 rounded-sm border border-dashed border-zinc-500" />bez termínu</span>
        <span className="inline-flex items-center gap-1.5"><i className="w-5 h-2.5 rounded-sm bg-white/10" />noc 22 až 8</span>
        {declined.length > 0 && <span>nejede: {declined.map(a => a.user.displayName).join(', ')}</span>}
      </div>
    </div>
  )
}
