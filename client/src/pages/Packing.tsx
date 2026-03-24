import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { PACKING_CATEGORIES, PACKING_CATEGORY_ICONS } from '../lib/constants'
import type { PackingItem } from '../lib/types'

export function Packing() {
  const { isAdmin } = useAuth()
  const [items, setItems] = useState<PackingItem[]>([])
  const [newItem, setNewItem] = useState({ name: '', category: 'general' })

  useEffect(() => { load() }, [])
  const load = () => api.getPacking().then(setItems)

  const grouped = items.reduce((acc: Record<string, PackingItem[]>, item) => {
    const cat = item.category || 'general'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    await api.createPackingItem(newItem)
    setNewItem({ name: '', category: 'general' })
    load()
  }

  return (
    <div>
      <h1 className="page-heading mb-1">Co zabalit</h1>
      <p className="text-zinc-500 text-sm mb-6">
        Obecný seznam věcí pro každou párty. Jednotlivé párty mohou mít navíc vlastní položky.
      </p>

      <div className="space-y-5">
        {Object.entries(PACKING_CATEGORIES).map(([key, label]) => (
          grouped[key]?.length ? (
            <div key={key}>
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <span>{PACKING_CATEGORY_ICONS[key]}</span>
                {label}
              </h2>
              <div className="space-y-1.5">
                {grouped[key].map(item => (
                  <div key={item.id} className="card px-4 py-2.5 flex items-center justify-between">
                    <span className="text-sm text-zinc-200">{item.name}</span>
                    {isAdmin && (
                      <button
                        onClick={async () => { if (!confirm(`Opravdu smazat položku "${item.name}"?`)) return; await api.deletePackingItem(item.id); load() }}
                        className="btn-danger text-xs py-0.5 px-2"
                      >
                        Smazat
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : null
        ))}
      </div>

      {isAdmin && (
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2 mt-8">
          <input
            value={newItem.name}
            onChange={e => setNewItem({ ...newItem, name: e.target.value })}
            required
            className="form-input"
            placeholder="Nová položka..."
          />
          <select
            value={newItem.category}
            onChange={e => setNewItem({ ...newItem, category: e.target.value })}
            className="form-select sm:w-40"
          >
            {Object.entries(PACKING_CATEGORIES).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <button type="submit" className="btn-primary sm:w-auto">Přidat</button>
        </form>
      )}
    </div>
  )
}
