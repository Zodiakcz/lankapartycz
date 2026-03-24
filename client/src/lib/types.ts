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
}


export interface ScheduleItem {
  id: number
  partyId: number
  day: number
  timeSlot: string
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
  totalAdvances: number
  totalNights: number
  perPerson: ExpenseSplitPerson[]
}
