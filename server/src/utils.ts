/**
 * Count nights stayed = number of midnights crossed between arrival and departure.
 * Uses date-only comparison (strips time), so arriving May 5 at 16:00
 * and leaving May 10 at 16:00 = 5 nights.
 */
export function countNights(arrival: Date, departure: Date): number {
  const a = new Date(arrival.getFullYear(), arrival.getMonth(), arrival.getDate())
  const d = new Date(departure.getFullYear(), departure.getMonth(), departure.getDate())
  return Math.max(0, Math.round((d.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)))
}
