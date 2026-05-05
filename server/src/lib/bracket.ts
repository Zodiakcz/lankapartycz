// Pure helpers for generating a single-elimination bracket.
// Output is index-based so the route can persist Entrant + Match rows in one transaction.

export type GeneratedEntrant = {
  user1Id: number
  user2Id: number | null
  sittingOut: boolean
}

export type GeneratedMatch = {
  round: number
  indexInRound: number
  side1EntrantIdx: number | null
  side1FromMatchIdx: number | null
  side2EntrantIdx: number | null
  side2FromMatchIdx: number | null
}

export type GeneratedBracket = {
  entrants: GeneratedEntrant[]
  matches: GeneratedMatch[]
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function prevPow2(n: number): number {
  let p = 1
  while (p * 2 <= n) p *= 2
  return p
}

export class BracketError extends Error {}

export function generateBracket(
  participantUserIds: number[],
  format: '1v1' | '2v2',
): GeneratedBracket {
  if (new Set(participantUserIds).size !== participantUserIds.length) {
    throw new BracketError('Duplicitní hráč v turnaji')
  }

  const shuffledUsers = shuffle(participantUserIds)
  const entrants: GeneratedEntrant[] = []
  const playingEntrantIdx: number[] = []

  if (format === '1v1') {
    if (shuffledUsers.length < 2) throw new BracketError('Pro 1v1 potřebuješ alespoň 2 hráče')
    for (const uid of shuffledUsers) {
      playingEntrantIdx.push(entrants.length)
      entrants.push({ user1Id: uid, user2Id: null, sittingOut: false })
    }
  } else {
    if (shuffledUsers.length < 4) throw new BracketError('Pro 2v2 potřebuješ alespoň 4 hráče')
    const evenCount = shuffledUsers.length - (shuffledUsers.length % 2)
    for (let i = 0; i < evenCount; i += 2) {
      playingEntrantIdx.push(entrants.length)
      entrants.push({ user1Id: shuffledUsers[i], user2Id: shuffledUsers[i + 1], sittingOut: false })
    }
    if (evenCount < shuffledUsers.length) {
      // Lone leftover player — visible as sittingOut, not in the bracket
      entrants.push({ user1Id: shuffledUsers[evenCount], user2Id: null, sittingOut: true })
    }
  }

  const matches: GeneratedMatch[] = []
  const N = playingEntrantIdx.length
  const baseSize = prevPow2(N)
  const playInCount = N - baseSize
  const byeCount = baseSize - playInCount

  const byeIdx = playingEntrantIdx.slice(0, byeCount)
  const playInIdx = playingEntrantIdx.slice(byeCount)

  // Round 1: play-in matches (only if N is not a power of 2)
  const playInMatchOffsets: number[] = []
  if (playInCount > 0) {
    for (let i = 0; i < playInCount; i++) {
      playInMatchOffsets.push(matches.length)
      matches.push({
        round: 1,
        indexInRound: i,
        side1EntrantIdx: playInIdx[2 * i],
        side1FromMatchIdx: null,
        side2EntrantIdx: playInIdx[2 * i + 1],
        side2FromMatchIdx: null,
      })
    }
  }

  // Build slot list for the round-of-baseSize: byes first, then play-in winners
  type Slot = { entrantIdx: number | null; fromMatchIdx: number | null }
  const slots: Slot[] = []
  for (const idx of byeIdx) slots.push({ entrantIdx: idx, fromMatchIdx: null })
  for (const m of playInMatchOffsets) slots.push({ entrantIdx: null, fromMatchIdx: m })

  const roundOfBaseSize = playInCount > 0 ? 2 : 1
  let currentRoundFirstIdx = matches.length
  for (let m = 0; m < baseSize / 2; m++) {
    const a = slots[2 * m]
    const b = slots[2 * m + 1]
    matches.push({
      round: roundOfBaseSize,
      indexInRound: m,
      side1EntrantIdx: a.entrantIdx,
      side1FromMatchIdx: a.fromMatchIdx,
      side2EntrantIdx: b.entrantIdx,
      side2FromMatchIdx: b.fromMatchIdx,
    })
  }

  // Subsequent rounds: each pair of prior matches feeds one new match
  let currentRoundSize = baseSize / 2
  let currentRound = roundOfBaseSize
  while (currentRoundSize > 1) {
    const nextRoundSize = currentRoundSize / 2
    const nextRound = currentRound + 1
    const nextRoundFirstIdx = matches.length
    for (let m = 0; m < nextRoundSize; m++) {
      matches.push({
        round: nextRound,
        indexInRound: m,
        side1EntrantIdx: null,
        side1FromMatchIdx: currentRoundFirstIdx + 2 * m,
        side2EntrantIdx: null,
        side2FromMatchIdx: currentRoundFirstIdx + 2 * m + 1,
      })
    }
    currentRoundSize = nextRoundSize
    currentRoundFirstIdx = nextRoundFirstIdx
    currentRound = nextRound
  }

  return { entrants, matches }
}
