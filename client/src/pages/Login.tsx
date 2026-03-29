import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'
import { APP_VERSION } from '../version'

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
    if (password.length < 6) {
      setError('Heslo musí mít alespoň 6 znaků')
      return
    }
    try {
      await api.selfRegister({ username, displayName, password })
      setSuccess('Žádost odeslána. Admin tě musí schválit — dej mu vědět přes Discord.')
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-950">
      {/* Background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            LAN <span className="text-indigo-400">Party</span>
          </h1>
          <a
            href="https://github.com/Zodiakcz/lankapartycz/commits/master"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors mt-1 inline-block"
          >
            {APP_VERSION}
          </a>
        </div>

        <div className="card p-6">
          {/* Tab switcher */}
          <div className="flex rounded-lg overflow-hidden border border-zinc-700 mb-6">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                mode === 'login'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Přihlášení
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                mode === 'register'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Registrace
            </button>
          </div>

          {error && (
            <div className="badge-red bg-red-900/30 border border-red-800/50 text-red-400 p-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="badge-green bg-emerald-900/30 border border-emerald-800/50 text-emerald-400 p-3 rounded-lg mb-4 text-sm">
              {success}
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="form-label">Uživatelské jméno</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="form-input"
                  autoFocus
                />
              </div>
              <div>
                <label className="form-label">Heslo</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="form-input"
                />
              </div>
              <button type="submit" className="btn-primary w-full mt-2">
                Přihlásit se
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="form-label">Uživatelské jméno</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="form-input"
                  autoFocus
                  required
                />
              </div>
              <div>
                <label className="form-label">Zobrazované jméno</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
              <div>
                <label className="form-label">Heslo (min. 4 znaky)</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
              <button type="submit" className="btn-primary w-full mt-2">
                Odeslat žádost
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
