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
      <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-300 mb-4">&larr; Zpět</button>
      <h1 className="text-2xl font-bold mb-6">Změna hesla</h1>
      <p className="text-gray-400 text-sm mb-4">Přihlášen jako <strong>{user?.displayName}</strong></p>

      {error && <div className="bg-red-900/50 text-red-300 p-3 rounded mb-4 text-sm">{error}</div>}
      {message && <div className="bg-green-900/50 text-green-300 p-3 rounded mb-4 text-sm">{message}</div>}

      <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Současné heslo</label>
          <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required
            className="w-full bg-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Nové heslo</label>
          <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required
            className="w-full bg-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Nové heslo znovu</label>
          <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required
            className="w-full bg-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-medium transition-colors">
          Změnit heslo
        </button>
      </form>
    </div>
  )
}
