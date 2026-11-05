import type { Attendance, Party } from './types'

// Arrival/departure are stored as wall-clock time in UTC fields (the server appends 'Z' to the
// datetime-local value), so all math and formatting here stays in UTC.

const MIN = 60_000
const HOUR = 60 * MIN
export const DAY = 24 * HOUR

export interface PartyWindow {
  start: number // first party day, 00:00
  end: number // day after the last party day, 00:00
  days: number
}

export interface Stay {
  att: Attendance
  from: number
  to: number
  noDates: boolean // neither arrival nor departure filled in: assume the whole party
  maybe: boolean
}

export interface Tally { sure: number; maybe: number }

export function partyWindow(party: Pick<Party, 'startDate' | 'endDate'>): PartyWindow {
  const start = Date.parse(party.startDate.slice(0, 10) + 'T00:00:00Z')
  const last = Date.parse(party.endDate.slice(0, 10) + 'T00:00:00Z')
  const days = Math.max(1, Math.round((last - start) / DAY) + 1)
  return { start, end: start + days * DAY, days }
}

/** Everyone not declined, sorted by arrival. Missing dates fall back to the party edges. */
export function stays(attendance: Attendance[], w: PartyWindow): Stay[] {
  return attendance
    .filter(a => a.status !== 'declined')
    .map(a => {
      const clamp = (t: number) => Math.min(w.end, Math.max(w.start, t))
      const from = clamp(a.arrival ? Date.parse(a.arrival) : w.start)
      const to = Math.max(from, clamp(a.departure ? Date.parse(a.departure) : w.end))
      return { att: a, from, to, noDates: !a.arrival && !a.departure, maybe: a.status === 'maybe' }
    })
    .sort((a, b) => Number(a.noDates) - Number(b.noDates) || a.from - b.from || a.att.user.displayName.localeCompare(b.att.user.displayName, 'cs'))
}

export const tally = (list: Stay[]): Tally => ({
  sure: list.filter(s => !s.maybe).length,
  maybe: list.filter(s => s.maybe).length,
})

export const dayStart = (w: PartyWindow, dayIndex: number) => w.start + dayIndex * DAY

export const presentAt = (list: Stay[], t: number) => list.filter(s => s.from <= t && t <= s.to)

/** Present at any moment of the day (0-based). */
export const presentOnDay = (list: Stay[], w: PartyWindow, dayIndex: number) => {
  const a = dayStart(w, dayIndex), b = a + DAY
  return list.filter(s => s.from < b && s.to > a)
}

/** The night after day `dayIndex`. Same rule as countNights in finance: a midnight crossed. */
export const presentOnNight = (list: Stay[], w: PartyWindow, dayIndex: number) => {
  const midnight = dayStart(w, dayIndex + 1)
  return list.filter(s => s.from < midnight && s.to >= midnight)
}

export const nightsOf = (s: Stay, w: PartyWindow) =>
  Array.from({ length: w.days - 1 }, (_, d) => d).filter(d => presentOnNight([s], w, d).length > 0).length

/** Schedule item day (1-based) + "HH:MM" → timestamp. */
export function scheduleTime(w: PartyWindow, day: number, time: string): number {
  const [h, m] = time.split(':').map(Number)
  return dayStart(w, day - 1) + (h || 0) * HOUR + (m || 0) * MIN
}

/** Current wall-clock time in the same UTC-as-local convention. */
export const nowFloating = () => Date.now() - new Date().getTimezoneOffset() * MIN

export interface Move { t: number; stay: Stay; kind: 'in' | 'out' }

/** Real arrivals and departures on a given day (not the assumed party edges). */
export function movesOnDay(list: Stay[], w: PartyWindow, dayIndex: number): Move[] {
  const a = dayStart(w, dayIndex), b = a + DAY
  const out: Move[] = []
  for (const s of list) {
    if (s.att.arrival && s.from >= a && s.from < b) out.push({ t: s.from, stay: s, kind: 'in' })
    if (s.att.departure && s.to >= a && s.to < b) out.push({ t: s.to, stay: s, kind: 'out' })
  }
  return out.sort((x, y) => x.t - y.t)
}

// ---- formatting ----

const pad = (n: number) => String(n).padStart(2, '0')
export const fmtTime = (t: number) => { const d = new Date(t); return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}` }
export const fmtWeekday = (t: number) => new Date(t).toLocaleDateString('cs-CZ', { weekday: 'short', timeZone: 'UTC' })
export const fmtDayTime = (t: number) => `${fmtWeekday(t)} ${fmtTime(t)}`
export const fmtDate = (t: number) => { const d = new Date(t); return `${d.getUTCDate()}. ${d.getUTCMonth() + 1}.` }

const ON_WEEKDAY = ['v neděli', 'v pondělí', 'v úterý', 've středu', 've čtvrtek', 'v pátek', 'v sobotu']
export const onWeekday = (t: number) => ON_WEEKDAY[new Date(t).getUTCDay()]

export const people = (n: number) => (n === 1 ? 'člověk' : n >= 2 && n <= 4 ? 'lidé' : 'lidí')
export const nights = (n: number) => (n === 1 ? 'noc' : n >= 2 && n <= 4 ? 'noci' : 'nocí')
export const fmtTally = ({ sure, maybe }: Tally) => `${sure}${maybe ? ` +${maybe}?` : ''}`
