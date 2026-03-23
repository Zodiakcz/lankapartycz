import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'

export function ChangePassword() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (newPassword !== confirmPassword) {
      setError('Nová hesla se neshodují')
      return
    }

    try {
      await api.changePassword({ currentPassword, newPassword })
      setMessage('Heslo bylo změněno')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="max-w-md">
      <button onClick={() => navigate(-1)} className="btn-ghost text-sm -ml-3 mb-4">
        &larr; Zpět
      </button>
      <h1 className="page-heading mb-1">Změna hesla</h1>
      <p className="text-zinc-500 text-sm mb-6">
        Přihlášen jako <span className="text-zinc-300 font-medium">{user?.displayName}</span>
      </p>

      {error && (
        <div className="bg-red-900/30 border border-red-800/50 text-red-400 p-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}
      {message && (
        <div className="bg-emerald-900/30 border border-emerald-800/50 text-emerald-400 p-3 rounded-lg mb-4 text-sm">
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card p-5 space-y-4">
        <div>
          <label className="form-label">Současné heslo</label>
          <input
            type="password"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            required
            className="form-input"
          />
        </div>
        <div>
          <label className="form-label">Nové heslo</label>
          <input
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            required
            className="form-input"
          />
        </div>
        <div>
          <label className="form-label">Nové heslo znovu</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
            className="form-input"
          />
        </div>
        <button type="submit" className="btn-primary w-full">
          Změnit heslo
        </button>
      </form>
    </div>
  )
}
