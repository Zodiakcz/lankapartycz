import type {
  User, Party, Game, Attendance, Expense, ExpenseSplit,
  PackingItem, FoodCategory, FoodEstimate, FoodCalculation, ShoppingItem, FaqItem, LeaderboardData, AchievementThresholds,
} from './types'

const BASE = '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `Chyba ${res.status}`)
  }
  return res.json()
}

type Ok = { ok: boolean }

export const api = {
  // Auth
  login: (username: string, password: string) =>
    request<User>('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => request<Ok>('/auth/logout', { method: 'POST' }),
  me: () => request<User>('/auth/me'),
  register: (data: { username: string; displayName: string; password: string; role?: string }) =>
    request<User>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  selfRegister: (data: { username: string; displayName: string; password: string }) =>
    request<User>('/auth/self-register', { method: 'POST', body: JSON.stringify(data) }),
  users: () => request<User[]>('/auth/users'),
  pendingUsers: () => request<User[]>('/auth/pending'),
  approveUser: (id: number) => request<Ok>(`/auth/approve/${id}`, { method: 'POST' }),
  updateUser: (id: number, data: { role?: string; displayName?: string }) =>
    request<User>(`/auth/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteUser: (id: number) => request<Ok>(`/auth/users/${id}`, { method: 'DELETE' }),
  changePassword: (data: { userId?: number; currentPassword?: string; newPassword: string }) =>
    request<Ok>('/auth/change-password', { method: 'POST', body: JSON.stringify(data) }),
  updateProfile: (data: { username?: string; displayName?: string }) =>
    request<User>('/auth/profile', { method: 'PATCH', body: JSON.stringify(data) }),
  profileStats: () =>
    request<{ parties: { id: number; name: string; startDate: string; status: string; nights: number }[]; totalNights: number }>('/auth/profile/stats'),

  // Parties
  parties: () => request<Party[]>('/parties'),
  party: (id: number) => request<Party>(`/parties/${id}`),
  createParty: (data: Partial<Party>) => request<Party>('/parties', { method: 'POST', body: JSON.stringify(data) }),
  updateParty: (id: number, data: Partial<Party>) => request<Party>(`/parties/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteParty: (id: number) => request<Ok>(`/parties/${id}`, { method: 'DELETE' }),

  // Attendance
  setAttendance: (partyId: number, data: Partial<Attendance>) =>
    request<Attendance>(`/attendance/${partyId}`, { method: 'POST', body: JSON.stringify(data) }),
  getAttendance: (partyId: number) => request<Attendance[]>(`/attendance/${partyId}`),
  adminEditAttendance: (partyId: number, userId: number, data: Partial<Attendance>) =>
    request<Attendance>(`/attendance/${partyId}/user/${userId}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Games
  games: () => request<Game[]>('/games'),
  createGame: (data: Partial<Game>) => request<Game>('/games', { method: 'POST', body: JSON.stringify(data) }),
  approveGame: (id: number) => request<Game>(`/games/${id}/approve`, { method: 'POST' }),
  updateGame: (id: number, data: Partial<Game>) => request<Game>(`/games/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteGame: (id: number) => request<Ok>(`/games/${id}`, { method: 'DELETE' }),

  // Schedule
  getSchedule: (partyId: number) => request<Party['schedule']>(`/schedule/${partyId}`),
  createScheduleItem: (partyId: number, data: { day: number; time: string; title: string; description?: string }) =>
    request<Party['schedule'][0]>(`/schedule/${partyId}`, { method: 'POST', body: JSON.stringify(data) }),
  updateScheduleItem: (id: number, data: { day?: number; time?: string; title?: string; description?: string }) =>
    request<Party['schedule'][0]>(`/schedule/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteScheduleItem: (id: number) => request<Ok>(`/schedule/${id}`, { method: 'DELETE' }),

  // Expenses
  getExpenses: (partyId: number) => request<Expense[]>(`/expenses/${partyId}`),
  createExpense: (partyId: number, data: { amount: number; description: string; paidByUserId?: number }) =>
    request<Expense>(`/expenses/${partyId}`, { method: 'POST', body: JSON.stringify(data) }),
  deleteExpense: (id: number) => request<Ok>(`/expenses/${id}`, { method: 'DELETE' }),
  getExpenseSplit: (partyId: number) => request<ExpenseSplit>(`/expenses/${partyId}/split`),
  setAdvancePaid: (partyId: number, userId: number) =>
    request<Attendance>(`/attendance/${partyId}/advance-paid/${userId}`, { method: 'PATCH' }),
  setSettled: (partyId: number, userId: number, settled: boolean) =>
    request<Ok>(`/expenses/${partyId}/settled/${userId}`, { method: 'PATCH', body: JSON.stringify({ settled }) }),

  // Shopping
  foodCategories: () => request<FoodCategory[]>('/shopping/categories'),
  getFoodEstimates: (partyId: number) => request<FoodEstimate[]>(`/shopping/${partyId}/food`),
  setFoodEstimate: (partyId: number, data: { category: string; perNight: number; unit: string }) =>
    request<FoodEstimate>(`/shopping/${partyId}/food`, { method: 'POST', body: JSON.stringify(data) }),
  calculateFood: (partyId: number) => request<FoodCalculation>(`/shopping/${partyId}/food/calculate`),
  toggleFoodPurchased: (partyId: number, category: string) =>
    request<Ok>(`/shopping/${partyId}/food/${category}/toggle`, { method: 'PATCH' }),
  getShoppingItems: (partyId: number) => request<ShoppingItem[]>(`/shopping/${partyId}/items`),
  addShoppingItem: (partyId: number, name: string) =>
    request<ShoppingItem>(`/shopping/${partyId}/items`, { method: 'POST', body: JSON.stringify({ name }) }),
  toggleShoppingItem: (partyId: number, id: number) =>
    request<Ok>(`/shopping/${partyId}/items/${id}`, { method: 'PATCH' }),
  deleteShoppingItem: (partyId: number, id: number) =>
    request<Ok>(`/shopping/${partyId}/items/${id}`, { method: 'DELETE' }),
  copyShoppingFrom: (partyId: number, sourcePartyId: number) =>
    request<Ok>(`/shopping/${partyId}/copy-from/${sourcePartyId}`, { method: 'POST' }),

  // Packing
  getPacking: (partyId?: number) => request<PackingItem[]>(`/packing${partyId ? `/${partyId}` : ''}`),
  createPackingItem: (data: { name: string; category: string; partyId?: number }) =>
    request<PackingItem>('/packing', { method: 'POST', body: JSON.stringify(data) }),
  deletePackingItem: (id: number) => request<Ok>(`/packing/${id}`, { method: 'DELETE' }),

  // FAQ
  getFaq: () => request<FaqItem[]>('/faq'),
  createFaqItem: (data: { question: string; answer: string; order?: number }) =>
    request<FaqItem>('/faq', { method: 'POST', body: JSON.stringify(data) }),
  updateFaqItem: (id: number, data: { question: string; answer: string; order?: number }) =>
    request<FaqItem>(`/faq/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  reorderFaq: (orderedIds: number[]) =>
    request<FaqItem[]>('/faq/reorder', { method: 'PUT', body: JSON.stringify({ orderedIds }) }),
  deleteFaqItem: (id: number) => request<Ok>(`/faq/${id}`, { method: 'DELETE' }),

  // Leaderboard
  leaderboard: () => request<LeaderboardData>('/leaderboard'),

  // Settings
  getSettings: () => request<AchievementThresholds>('/settings'),
  updateSettings: (data: Partial<AchievementThresholds>) =>
    request<AchievementThresholds>('/settings', { method: 'PUT', body: JSON.stringify(data) }),
}
