import { useState, useEffect } from 'react'
import { api } from '../lib/api'

export function Admin() {
  const [users, setUsers] = useState<any[]>([])
  const [pending, setPending] = useState<any[]>([])
  const [form, setForm] = useState({ username: '', displayName: '', password: '', role: 'member' })
  const [message, setMessage] = useState('')

  useEffect(() => { load() }, [])

  const load = () => {
    api.users().then(setUsers)
    api.pendingUsers().then(setPending)
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    try {
      await api.register(form)
      setForm({ username: '', displayName: '', password: '', role: 'member' })
      setMessage('Uživatel vytvořen')
      load()
    } catch (err: any) {
      setMessage(err.message)
    }
  }

  const handleApprove = async (id: number) => {
    await api.approveUser(id)
    load()
  }

  const handleReject = async (id: number) => {
    await api.deleteUser(id)
    load()
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Správa uživatelů</h1>

      {/* Pending approvals */}
      {pending.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3 text-yellow-400">Čekající žádosti ({pending.length})</h2>
          <div className="space-y-2">
            {pending.map(u => (
              <div key={u.id} className="bg-gray-800 rounded p-3 border border-yellow-700/50 flex items-center justify-between">
                <div>
                  <span className="font-medium">{u.displayName}</span>
                  <span className="text-gray-500 text-sm ml-2">@{u.username}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(u.id)}
                    className="bg-green-700 hover:bg-green-600 text-white px-3 py-1 rounded text-sm transition-colors"
                  >
                    Schválit
                  </button>
                  <button
                    onClick={() => handleReject(u.id)}
                    className="bg-red-800 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
                  >
                    Odmítnout
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User list */}
      <div className="space-y-2 mb-8">
        {users.map(u => (
          <div key={u.id} className="bg-gray-800 rounded p-3 border border-gray-700 flex items-center justify-between">
            <div>
              <span className="font-medium">{u.displayName}</span>
              <span className="text-gray-500 text-sm ml-2">@{u.username}</span>
            </div>
            <span className={`text-xs px-2 py-1 rounded ${u.role === 'admin' ? 'bg-purple-900/50 text-purple-400' : 'bg-gray-700 text-gray-400'}`}>
              {u.role === 'admin' ? 'Admin' : 'Člen'}
            </span>
          </div>
        ))}
      </div>

      {/* Register form */}
      <h2 className="text-lg font-semibold mb-3">Přidat uživatele</h2>
      {message && <div className="bg-gray-800 text-blue-400 p-3 rounded mb-4 text-sm">{message}</div>}
      <form onSubmit={handleRegister} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input placeholder="Uživatelské jméno" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required
            className="bg-gray-700 rounded px-3 py-2 text-white" />
          <input placeholder="Zobrazované jméno" value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} required
            className="bg-gray-700 rounded px-3 py-2 text-white" />
          <input type="password" placeholder="Heslo" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required
            className="bg-gray-700 rounded px-3 py-2 text-white" />
          <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
            className="bg-gray-700 rounded px-3 py-2 text-white">
            <option value="member">Člen</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm mt-4">Vytvořit účet</button>
      </form>
    </div>
  )
}
