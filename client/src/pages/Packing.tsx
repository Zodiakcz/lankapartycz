import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'

const CATEGORIES: Record<string, string> = {
  hardware: 'Hardware',
  general: 'Obecné',
  food: 'Jídlo & pití',
  other: 'Ostatní',
}

export function Packing() {
  const { isAdmin } = useAuth()
  const [items, setItems] = useState<any[]>([])
  const [newItem, setNewItem] = useState({ name: '', category: 'general' })

  useEffect(() => { load() }, [])
  const load = () => api.getPacking().then(setItems)

  const grouped = items.reduce((acc: Record<string, any[]>, item) => {
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
      <h1 className="text-2xl font-bold mb-6">Co zabalit</h1>
      <p className="text-gray-400 text-sm mb-6">Obecný seznam věcí, které se hodí na každou párty. Jednotlivé párty mohou mít navíc vlastní položky.</p>

      <div className="space-y-6">
        {Object.entries(CATEGORIES).map(([key, label]) => (
          grouped[key]?.length ? (
            <div key={key}>
              <h2 className="text-lg font-semibold text-gray-300 mb-2">{label}</h2>
              <div className="space-y-1">
                {grouped[key].map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between bg-gray-800 rounded p-3 border border-gray-700">
                    <span>{item.name}</span>
                    {isAdmin && (
                      <button onClick={async () => { await api.deletePackingItem(item.id); load() }}
                        className="text-red-500 hover:text-red-400 text-xs">Smazat</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : null
        ))}
      </div>

      {isAdmin && (
        <form onSubmit={handleAdd} className="flex gap-2 items-end mt-6">
          <input value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} required
            className="bg-gray-700 rounded px-3 py-2 text-white flex-1" placeholder="Nová položka..." />
          <select value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })}
            className="bg-gray-700 rounded px-3 py-2 text-white">
            {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm">Přidat</button>
        </form>
      )}
    </div>
  )
}
