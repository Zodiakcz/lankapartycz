import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import type { User } from '../lib/types'

export function Admin() {
  const [users, setUsers] = useState<User[]>([])
  const [pending, setPending] = useState<User[]>([])
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

  const handleToggleRole = async (u: User) => {
    const newRole = u.role === 'admin' ? 'member' : 'admin'
    try {
      await api.updateUser(u.id, { role: newRole })
      setEditMsg({ id: u.id, text: `Role změněna na ${newRole === 'admin' ? 'Admin' : 'Člen'}`, ok: true })
      load()
    } catch (err: any) {
      setEditMsg({ id: u.id, text: err.message, ok: false })
    }
  }

  const handleSetPassword = async (u: User) => {
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

  const handleDelete = async (u: User) => {
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
      <h1 className="page-heading mb-6">Správa uživatelů</h1>

      {/* Pending approvals */}
      {pending.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs font-semibold text-amber-500 uppercase tracking-wider mb-3">
            Čekající žádosti ({pending.length})
          </h2>
          <div className="space-y-2">
            {pending.map(u => (
              <div key={u.id} className="card px-4 py-3 border-amber-800/30 flex items-center justify-between gap-3">
                <div>
                  <span className="font-medium text-zinc-100">{u.displayName}</span>
                  <span className="text-zinc-500 text-sm ml-2">@{u.username}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleApprove(u.id)} className="btn-success">
                    Schválit
                  </button>
                  <button onClick={() => handleReject(u.id)} className="btn-danger">
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
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Uživatelé</h2>
        {users.map(u => (
          <div key={u.id} className="card overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <span className="font-medium text-zinc-100">{u.displayName}</span>
                  <span className="text-zinc-500 text-sm ml-2">@{u.username}</span>
                </div>
                <span className={`badge ${u.role === 'admin' ? 'badge-purple' : 'badge-gray'}`}>
                  {u.role === 'admin' ? 'Admin' : 'Člen'}
                </span>
              </div>
              <button
                onClick={() => toggleEdit(u.id)}
                className="btn-ghost text-sm py-1"
              >
                {editingId === u.id ? '✕ Zavřít' : '✎ Upravit'}
              </button>
            </div>

            {editingId === u.id && (
              <div className="border-t border-white/8 px-4 py-4 bg-zinc-800/30 space-y-4">
                {editMsg !== null && editMsg.id === u.id && (
                  <div className={`text-sm px-3 py-2 rounded-lg ${
                    editMsg.ok
                      ? 'bg-emerald-900/30 border border-emerald-800/50 text-emerald-400'
                      : 'bg-red-900/30 border border-red-800/50 text-red-400'
                  }`}>
                    {editMsg.text}
                  </div>
                )}

                <div>
                  <p className="form-label">Nové heslo</p>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      placeholder="Min. 4 znaky"
                      value={editPw}
                      onChange={e => setEditPw(e.target.value)}
                      className="form-input"
                    />
                    <button onClick={() => handleSetPassword(u)} className="btn-primary flex-shrink-0">
                      Nastavit
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-sm text-zinc-400">
                    Role:{' '}
                    <span className={u.role === 'admin' ? 'text-violet-400' : 'text-zinc-300'}>
                      {u.role === 'admin' ? 'Admin' : 'Člen'}
                    </span>
                  </p>
                  <button
                    onClick={() => handleToggleRole(u)}
                    className="btn-secondary text-violet-400 border-violet-800/50 text-sm"
                  >
                    {u.role === 'admin' ? 'Změnit na Člen' : 'Změnit na Admin'}
                  </button>
                </div>

                <div className="flex justify-end pt-1 border-t border-white/8">
                  <button onClick={() => handleDelete(u)} className="btn-danger">
                    Smazat uživatele
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create user form */}
      <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Přidat uživatele</h2>
      {message && (
        <div className="bg-indigo-900/30 border border-indigo-800/50 text-indigo-300 p-3 rounded-lg mb-4 text-sm">
          {message}
        </div>
      )}
      <form onSubmit={handleRegister} className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Uživatelské jméno</label>
            <input placeholder="jannovak" value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })} required
              className="form-input" />
          </div>
          <div>
            <label className="form-label">Zobrazované jméno</label>
            <input placeholder="Jan Novák" value={form.displayName}
              onChange={e => setForm({ ...form, displayName: e.target.value })} required
              className="form-input" />
          </div>
          <div>
            <label className="form-label">Heslo</label>
            <input type="password" placeholder="Min. 4 znaky" value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })} required
              className="form-input" />
          </div>
          <div>
            <label className="form-label">Role</label>
            <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
              className="form-select">
              <option value="member">Člen</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
        <button type="submit" className="btn-primary mt-4">Vytvořit účet</button>
      </form>
    </div>
  )
}
