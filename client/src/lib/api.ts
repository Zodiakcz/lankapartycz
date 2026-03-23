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

export const api = {
  // Auth
  login: (username: string, password: string) =>
    request<any>('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => request<any>('/auth/logout', { method: 'POST' }),
  me: () => request<any>('/auth/me'),
  register: (data: { username: string; displayName: string; password: string; role?: string }) =>
    request<any>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  selfRegister: (data: { username: string; displayName: string; password: string }) =>
    request<any>('/auth/self-register', { method: 'POST', body: JSON.stringify(data) }),
  users: () => request<any[]>('/auth/users'),
  pendingUsers: () => request<any[]>('/auth/pending'),
  approveUser: (id: number) => request<any>(`/auth/approve/${id}`, { method: 'POST' }),
  updateUser: (id: number, data: { role?: string; displayName?: string }) =>
    request<any>(`/auth/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteUser: (id: number) => request<any>(`/auth/users/${id}`, { method: 'DELETE' }),
  changePassword: (data: { userId?: number; currentPassword?: string; newPassword: string }) =>
    request<any>('/auth/change-password', { method: 'POST', body: JSON.stringify(data) }),

  // Parties
  parties: () => request<any[]>('/parties'),
  party: (id: number) => request<any>(`/parties/${id}`),
  createParty: (data: any) => request<any>('/parties', { method: 'POST', body: JSON.stringify(data) }),
  updateParty: (id: number, data: any) => request<any>(`/parties/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteParty: (id: number) => request<any>(`/parties/${id}`, { method: 'DELETE' }),

  // Attendance
  setAttendance: (partyId: number, data: any) =>
    request<any>(`/attendance/${partyId}`, { method: 'POST', body: JSON.stringify(data) }),
  getAttendance: (partyId: number) => request<any[]>(`/attendance/${partyId}`),
  adminEditAttendance: (partyId: number, userId: number, data: any) =>
    request<any>(`/attendance/${partyId}/user/${userId}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Games
  games: () => request<any[]>('/games'),
  createGame: (data: any) => request<any>('/games', { method: 'POST', body: JSON.stringify(data) }),
  updateGame: (id: number, data: any) => request<any>(`/games/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteGame: (id: number) => request<any>(`/games/${id}`, { method: 'DELETE' }),
  addGameToParty: (partyId: number, gameId: number) =>
    request<any>(`/games/party/${partyId}/${gameId}`, { method: 'POST' }),
  removeGameFromParty: (partyId: number, gameId: number) =>
    request<any>(`/games/party/${partyId}/${gameId}`, { method: 'DELETE' }),

  // Schedule
  getSchedule: (partyId: number) => request<any[]>(`/schedule/${partyId}`),
  createScheduleItem: (partyId: number, data: any) =>
    request<any>(`/schedule/${partyId}`, { method: 'POST', body: JSON.stringify(data) }),
  updateScheduleItem: (id: number, data: any) =>
    request<any>(`/schedule/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteScheduleItem: (id: number) => request<any>(`/schedule/${id}`, { method: 'DELETE' }),

  // Expenses
  getExpenses: (partyId: number) => request<any[]>(`/expenses/${partyId}`),
  createExpense: (partyId: number, data: any) =>
    request<any>(`/expenses/${partyId}`, { method: 'POST', body: JSON.stringify(data) }),
  deleteExpense: (id: number) => request<any>(`/expenses/${id}`, { method: 'DELETE' }),
  getExpenseSplit: (partyId: number) => request<any>(`/expenses/${partyId}/split`),
  setSettled: (partyId: number, userId: number, settled: boolean) =>
    request<any>(`/expenses/${partyId}/settled/${userId}`, { method: 'PATCH', body: JSON.stringify({ settled }) }),

  // Shopping
  foodCategories: () => request<any[]>('/shopping/categories'),
  getFoodEstimates: (partyId: number) => request<any[]>(`/shopping/${partyId}/food`),
  setFoodEstimate: (partyId: number, data: { category: string; perNight: number; unit: string }) =>
    request<any>(`/shopping/${partyId}/food`, { method: 'POST', body: JSON.stringify(data) }),
  calculateFood: (partyId: number) => request<any>(`/shopping/${partyId}/food/calculate`),
  toggleFoodPurchased: (partyId: number, category: string) =>
    request<any>(`/shopping/${partyId}/food/${category}/toggle`, { method: 'PATCH' }),
  getShoppingItems: (partyId: number) => request<any[]>(`/shopping/${partyId}/items`),
  addShoppingItem: (partyId: number, name: string) =>
    request<any>(`/shopping/${partyId}/items`, { method: 'POST', body: JSON.stringify({ name }) }),
  toggleShoppingItem: (partyId: number, id: number) =>
    request<any>(`/shopping/${partyId}/items/${id}`, { method: 'PATCH' }),
  deleteShoppingItem: (partyId: number, id: number) =>
    request<any>(`/shopping/${partyId}/items/${id}`, { method: 'DELETE' }),

  // Packing
  getPacking: (partyId?: number) => request<any[]>(`/packing${partyId ? `/${partyId}` : ''}`),
  createPackingItem: (data: any) => request<any>('/packing', { method: 'POST', body: JSON.stringify(data) }),
  deletePackingItem: (id: number) => request<any>(`/packing/${id}`, { method: 'DELETE' }),
}
