export interface User {
  id: number
  username: string
  displayName: string
  role: 'admin' | 'member'
  approved: boolean
}

export interface Attendance {
  id: number
  userId: number
  partyId: number
  status: 'confirmed' | 'maybe' | 'declined'
  arrival: string | null
  departure: string | null
  advance: number
  advancePaid: boolean
  settled: boolean
  user: User
}

export interface Game {
  id: number
  name: string
  source: string
  sourceNote: string | null
  minPlayers: number
  maxPlayers: number | null
  storeUrl: string
  tier: GameTier
  price: number
  submittedById: number | null
  submittedBy: { id: number; displayName: string } | null
  votes: { userId: number; user: { id: number; displayName: string } }[]
}

export type GameTier = 'gold' | 'silver' | 'bronze'


export interface ScheduleItem {
  id: number
  partyId: number
  day: number
  time: string
  title: string
  description: string | null
}

export interface Expense {
  id: number
  partyId: number
  amount: number
  description: string
  paidByUserId: number
  paidBy: User
}

export interface Party {
  id: number
  name: string
  location: string
  startDate: string
  endDate: string
  description: string | null
  placeAddress: string | null
  placeStatus: string
  advancePerNight: number
  stayPricePerNight: number
  stayPaidByUserId: number | null
  financesLocked: boolean
  notes: string | null
  attendance: Attendance[]
  schedule: ScheduleItem[]
  expenses: Expense[]
  _count?: { attendance: number }
}

export interface PackingItem {
  id: number
  name: string
  category: string
  partyId: number | null
}

export interface FoodCategory {
  key: string
  label: string
  defaultUnit: string
}

export interface FoodEstimate {
  category: string
  perNight: number
  unit: string
  purchased: boolean
}

export interface FoodCalcPerson {
  user: User
  nights: number
}

export interface FoodCalcAmount {
  category: string
  totalNeeded: number
}

export interface FoodCalculation {
  confirmedPeople: number
  totalNights: number
  perPerson: FoodCalcPerson[]
  amounts: FoodCalcAmount[]
}

export interface ShoppingItem {
  id: number
  name: string
  checked: boolean
}

export interface ExpenseSplitPerson {
  user: User
  nights: number
  owes: number
  advance: number
  paid: number
  balance: number
  settled: boolean
}

export interface ExpenseSplit {
  sharedTotal: number
  expensesTotal: number
  stayCost: number
  stayPricePerNight: number
  stayPaidByUserId: number | null
  totalAdvances: number
  totalNights: number
  perPerson: ExpenseSplitPerson[]
}

export interface FaqItem {
  id: number
  question: string
  answer: string
  order: number
  createdAt: string
}

export interface LeaderboardEntry {
  user: { id: number; displayName: string }
  eventsAttended: number
  totalNights: number
  totalSpent: number
  eventsSupplied: number
}

export interface LeaderboardData {
  stats: LeaderboardEntry[]
  totalParties: number
}

export interface TournamentEntrant {
  id: number
  tournamentId: number
  user1Id: number
  user2Id: number | null
  sittingOut: boolean
  user1: { id: number; displayName: string }
  user2: { id: number; displayName: string } | null
}

export interface TournamentMatch {
  id: number
  tournamentId: number
  round: number
  indexInRound: number
  side1EntrantId: number | null
  side1FromMatchId: number | null
  side2EntrantId: number | null
  side2FromMatchId: number | null
  winnerEntrantId: number | null
}

export interface Tournament {
  id: number
  partyId: number
  name: string
  format: '1v1' | '2v2'
  status: 'active' | 'complete'
  createdAt: string
  entrants: TournamentEntrant[]
  matches: TournamentMatch[]
}

export interface AchievementThresholds {
  threshold_veteran: number
  threshold_nocni_valecnik: number
  threshold_sponzor: number
  threshold_velky_sponzor: number
  threshold_nakupovac: number
}
