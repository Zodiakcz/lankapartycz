import { useState, useEffect } from 'react'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'
import type { FaqItem } from '../lib/types'

export function Faq() {
  const { isAdmin } = useAuth()
  const [items, setItems] = useState<FaqItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // new item form
  const [showForm, setShowForm] = useState(false)
  const [newQ, setNewQ] = useState('')
  const [newA, setNewA] = useState('')
  const [saving, setSaving] = useState(false)

  // edit state
  const [editId, setEditId] = useState<number | null>(null)
  const [editQ, setEditQ] = useState('')
  const [editA, setEditA] = useState('')

  useEffect(() => {
    api.getFaq()
      .then(setItems)
      .catch(() => setError('Nepodařilo se načíst FAQ'))
      .finally(() => setLoading(false))
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newQ.trim() || !newA.trim()) return
    setSaving(true)
    try {
      const item = await api.createFaqItem({ question: newQ.trim(), answer: newA.trim(), order: items.length })
      setItems(prev => [...prev, item])
      setNewQ('')
      setNewA('')
      setShowForm(false)
    } catch {
      setError('Nepodařilo se přidat položku')
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate(id: number) {
    if (!editQ.trim() || !editA.trim()) return
    setSaving(true)
    try {
      const item = await api.updateFaqItem(id, { question: editQ.trim(), answer: editA.trim() })
      setItems(prev => prev.map(i => i.id === id ? item : i))
      setEditId(null)
    } catch {
      setError('Nepodařilo se uložit změny')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Smazat tuto položku?')) return
    try {
      await api.deleteFaqItem(id)
      setItems(prev => prev.filter(i => i.id !== id))
    } catch {
      setError('Nepodařilo se smazat položku')
    }
  }

  function startEdit(item: FaqItem) {
    setEditId(item.id)
    setEditQ(item.question)
    setEditA(item.answer)
  }

  if (loading) return <div className="text-zinc-400 text-sm">Načítání...</div>

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">FAQ</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Průvodce pro nováčky a odpovědi na časté otázky</p>
        </div>
        {isAdmin && !showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary text-sm">
            + Přidat
          </button>
        )}
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {isAdmin && showForm && (
        <form onSubmit={handleCreate} className="card space-y-3">
          <h2 className="text-sm font-semibold text-zinc-300">Nová položka</h2>
          <div>
            <label className="form-label">Otázka</label>
            <input
              className="form-input w-full"
              value={newQ}
              onChange={e => setNewQ(e.target.value)}
              placeholder="Např. Jak se přihlásit?"
              required
            />
          </div>
          <div>
            <label className="form-label">Odpověď</label>
            <textarea
              className="form-input w-full min-h-[100px] resize-y"
              value={newA}
              onChange={e => setNewA(e.target.value)}
              placeholder="Podrobná odpověď..."
              required
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => { setShowForm(false); setNewQ(''); setNewA('') }} className="btn-secondary text-sm">
              Zrušit
            </button>
            <button type="submit" disabled={saving} className="btn-primary text-sm">
              {saving ? 'Ukládám...' : 'Přidat'}
            </button>
          </div>
        </form>
      )}

      {items.length === 0 && !showForm && (
        <div className="card text-center text-zinc-500 text-sm py-8">
          Zatím žádné položky FAQ.{isAdmin ? ' Přidejte první pomocí tlačítka výše.' : ''}
        </div>
      )}

      <div className="space-y-3">
        {items.map(item => (
          <div key={item.id} className="card">
            {editId === item.id ? (
              <div className="space-y-3">
                <div>
                  <label className="form-label">Otázka</label>
                  <input
                    className="form-input w-full"
                    value={editQ}
                    onChange={e => setEditQ(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Odpověď</label>
                  <textarea
                    className="form-input w-full min-h-[100px] resize-y"
                    value={editA}
                    onChange={e => setEditA(e.target.value)}
                    required
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setEditId(null)} className="btn-secondary text-sm">Zrušit</button>
                  <button onClick={() => handleUpdate(item.id)} disabled={saving} className="btn-primary text-sm">
                    {saving ? 'Ukládám...' : 'Uložit'}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-white text-sm">{item.question}</h3>
                  {isAdmin && (
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => startEdit(item)} className="btn-ghost text-xs px-2 py-1">Upravit</button>
                      <button onClick={() => handleDelete(item.id)} className="btn-danger text-xs px-2 py-1">Smazat</button>
                    </div>
                  )}
                </div>
                <p className="text-zinc-300 text-sm mt-2 whitespace-pre-wrap">{item.answer}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
