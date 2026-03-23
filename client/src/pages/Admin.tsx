import { useState, useEffect } from 'react'
import { api } from '../lib/api'

export function Admin() {
  const [users, setUsers] = useState<any[]>([])
  const [pending, setPending] = useState<any[]>([])
  const [form, setForm] = useState({ username: '', displayName: '', password: '', role: 'member' })
  const [message, setMessage] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editPw, setEditPw] = useState('')
  const [editMsg, setEditMsg] = useState<{ id: number; text: string; ok: boolean } | null>(null)

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

  const handleToggleRole = async (u: any) => {
    const newRole = u.role === 'admin' ? 'member' : 'admin'
    try {
      await api.updateUser(u.id, { role: newRole })
      setEditMsg({ id: u.id, text: `Role změněna na ${newRole === 'admin' ? 'Admin' : 'Člen'}`, ok: true })
      load()
    } catch (err: any) {
      setEditMsg({ id: u.id, text: err.message, ok: false })
    }
  }

  const handleSetPassword = async (u: any) => {
    if (!editPw || editPw.length < 4) {
      setEditMsg({ id: u.id, text: 'Heslo musí mít alespoň 4 znaky', ok: false })
      return
    }
    try {
      await api.changePassword({ userId: u.id, newPassword: editPw })
      setEditPw('')
      setEditMsg({ id: u.id, text: 'Heslo změněno', ok: true })
    } catch (err: any) {
      setEditMsg({ id: u.id, text: err.message, ok: false })
    }
  }

  const handleDelete = async (u: any) => {
    if (!confirm(`Opravdu smazat uživatele "${u.displayName}"?`)) return
    try {
      await api.deleteUser(u.id)
      setEditingId(null)
      load()
    } catch (err: any) {
      setEditMsg({ id: u.id, text: err.message, ok: false })
    }
  }

  const toggleEdit = (id: number) => {
    setEditingId(prev => prev === id ? null : id)
    setEditPw('')
    setEditMsg(null)
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
          <div key={u.id} className="bg-gray-800 rounded border border-gray-700 overflow-hidden">
            <div className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <span className="font-medium">{u.displayName}</span>
                  <span className="text-gray-500 text-sm ml-2">@{u.username}</span>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${u.role === 'admin' ? 'bg-purple-900/50 text-purple-400' : 'bg-gray-700 text-gray-400'}`}>
                  {u.role === 'admin' ? 'Admin' : 'Člen'}
                </span>
              </div>
              <button
                onClick={() => toggleEdit(u.id)}
                className="text-gray-400 hover:text-white px-2 py-1 rounded text-sm transition-colors"
              >
                {editingId === u.id ? '✕ Zavřít' : '✎ Upravit'}
              </button>
            </div>

            {editingId === u.id && (
              <div className="border-t border-gray-700 p-3 bg-gray-850 space-y-3">
                {editMsg !== null && editMsg.id === u.id && (
                  <div className={`text-sm px-3 py-2 rounded ${editMsg.ok ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
                    {editMsg.text}
                  </div>
                )}

                {/* Change password */}
                <div>
                  <p className="text-xs text-gray-400 mb-1">Nové heslo</p>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      placeholder="Nové heslo (min. 4 znaky)"
                      value={editPw}
                      onChange={e => setEditPw(e.target.value)}
                      className="bg-gray-700 rounded px-3 py-1.5 text-white text-sm flex-1"
                    />
                    <button
                      onClick={() => handleSetPassword(u)}
                      className="bg-blue-700 hover:bg-blue-600 text-white px-3 py-1.5 rounded text-sm transition-colors"
                    >
                      Nastavit heslo
                    </button>
                  </div>
                </div>

                {/* Toggle role */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400">Aktuální role: <span className={u.role === 'admin' ? 'text-purple-400' : 'text-gray-300'}>{u.role === 'admin' ? 'Admin' : 'Člen'}</span></p>
                  </div>
                  <button
                    onClick={() => handleToggleRole(u)}
                    className="bg-purple-800 hover:bg-purple-700 text-white px-3 py-1.5 rounded text-sm transition-colors"
                  >
                    {u.role === 'admin' ? 'Změnit na Člen' : 'Změnit na Admin'}
                  </button>
                </div>

                {/* Delete */}
                <div className="flex justify-end pt-1 border-t border-gray-700">
                  <button
                    onClick={() => handleDelete(u)}
                    className="bg-red-900 hover:bg-red-800 text-red-300 px-3 py-1.5 rounded text-sm transition-colors"
                  >
                    Smazat uživatele
                  </button>
                </div>
              </div>
            )}
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
