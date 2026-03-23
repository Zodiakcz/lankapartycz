import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'

export function Login() {
  const { login } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await login(username, password)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (password.length < 4) {
      setError('Heslo musí mít alespoň 4 znaky')
      return
    }
    try {
      await api.selfRegister({ username, displayName, password })
      setSuccess('Žádost odeslána. Admin tě schválí přes Discord.')
      setUsername('')
      setPassword('')
      setDisplayName('')
    } catch (err: any) {
      setError(err.message)
    }
  }

  const switchMode = (newMode: 'login' | 'register') => {
    setMode(newMode)
    setError('')
    setSuccess('')
    setUsername('')
    setPassword('')
    setDisplayName('')
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-lg w-full max-w-sm">
        <a href="https://github.com/Zodiakcz/lankapartycz/commits/master" target="_blank" rel="noopener noreferrer"
          className="block text-xs text-gray-500 hover:text-gray-300 text-center mb-2 transition-colors">v1.9</a>
        <h1 className="text-2xl font-bold text-center mb-6 text-blue-400">LAN Party</h1>

        {/* Tab switcher */}
        <div className="flex rounded-lg overflow-hidden border border-gray-700 mb-6">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${mode === 'login' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-white'}`}
          >
            Přihlášení
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${mode === 'register' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-white'}`}
          >
            Registrace
          </button>
        </div>

        {error && <div className="bg-red-900/50 text-red-300 p-3 rounded mb-4 text-sm">{error}</div>}
        {success && <div className="bg-green-900/50 text-green-300 p-3 rounded mb-4 text-sm">{success}</div>}

        {mode === 'login' ? (
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-1">Uživatelské jméno</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
            <div className="mb-6">
              <label className="block text-sm text-gray-400 mb-1">Heslo</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-medium transition-colors"
            >
              Přihlásit se
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-1">Uživatelské jméno</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-1">Zobrazované jméno</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="w-full bg-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="mb-6">
              <label className="block text-sm text-gray-400 mb-1">Heslo (min. 4 znaky)</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-medium transition-colors"
            >
              Odeslat žádost
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
