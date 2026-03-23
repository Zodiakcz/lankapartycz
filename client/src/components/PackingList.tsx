import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { PACKING_CATEGORIES } from '../lib/constants'
import type { PackingItem } from '../lib/types'

export function PackingList({ partyId, isAdmin }: { partyId: number; isAdmin: boolean }) {
  const [items, setItems] = useState<PackingItem[]>([])
  const [newItem, setNewItem] = useState({ name: '', category: 'general' })

  useEffect(() => { load() }, [partyId])
  const load = () => api.getPacking(partyId).then(setItems)

  const grouped = items.reduce((acc: Record<string, PackingItem[]>, item) => {
    const cat = item.category || 'general'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    await api.createPackingItem({ ...newItem, partyId })
    setNewItem({ name: '', category: 'general' })
    load()
  }

  return (
    <div className="space-y-4">
      {Object.entries(PACKING_CATEGORIES).map(([key, label]) => (
        grouped[key]?.length ? (
          <div key={key}>
            <h4 className="text-sm font-semibold text-zinc-400 mb-2">{label}</h4>
            <div className="space-y-1">
              {grouped[key].map(item => (
                <div key={item.id} className="card flex items-center justify-between p-2">
                  <span>{item.name} {item.partyId && <span className="text-xs text-indigo-400">(pro tuto párty)</span>}</span>
                  {isAdmin && item.partyId && (
                    <button onClick={async () => { await api.deletePackingItem(item.id); load() }}
                      className="btn-danger text-xs py-0.5 px-2">Smazat</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : null
      ))}
      {isAdmin && (
        <form onSubmit={handleAdd} className="flex gap-2 items-end">
          <input value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} required
            className="form-input flex-1 w-auto" placeholder="Nová položka..." />
          <select value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })}
            className="form-select">
            {Object.entries(PACKING_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button type="submit" className="btn-primary">Přidat</button>
        </form>
      )}
    </div>
  )
}
