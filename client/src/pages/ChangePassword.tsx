import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'

export function ChangePassword() {
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()

  // Profile fields
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [username, setUsername] = useState(user?.username ?? '')
  const [profileMessage, setProfileMessage] = useState('')
  const [profileError, setProfileError] = useState('')

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileError('')
    setProfileMessage('')

    if (!displayName.trim()) {
      setProfileError('Zobrazované jméno nesmí být prázdné')
      return
    }
    if (!username.trim() || username.trim().length < 3) {
      setProfileError('Přihlašovací jméno musí mít alespoň 3 znaky')
      return
    }

    try {
      const updated = await api.updateProfile({
        displayName: displayName.trim(),
        username: username.trim(),
      })
      updateUser(updated)
      setProfileMessage('Profil byl aktualizován')
    } catch (err: any) {
      setProfileError(err.message)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
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
      <h1 className="page-heading mb-1">Nastavení účtu</h1>
      <p className="text-zinc-500 text-sm mb-6">
        Přihlášen jako <span className="text-zinc-300 font-medium">{user?.displayName}</span>
      </p>

      {/* Profile section */}
      <h2 className="text-lg font-semibold text-zinc-200 mb-3">Změna jména</h2>

      {profileError && (
        <div className="bg-red-900/30 border border-red-800/50 text-red-400 p-3 rounded-lg mb-4 text-sm">
          {profileError}
        </div>
      )}
      {profileMessage && (
        <div className="bg-emerald-900/30 border border-emerald-800/50 text-emerald-400 p-3 rounded-lg mb-4 text-sm">
          {profileMessage}
        </div>
      )}

      <form onSubmit={handleProfileSubmit} className="card p-5 space-y-4 mb-8">
        <div>
          <label className="form-label">Zobrazované jméno</label>
          <input
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            required
            className="form-input"
          />
        </div>
        <div>
          <label className="form-label">Přihlašovací jméno</label>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            className="form-input"
          />
        </div>
        <button type="submit" className="btn-primary w-full">
          Uložit změny
        </button>
      </form>

      {/* Password section */}
      <h2 className="text-lg font-semibold text-zinc-200 mb-3">Změna hesla</h2>

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

      <form onSubmit={handlePasswordSubmit} className="card p-5 space-y-4">
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
