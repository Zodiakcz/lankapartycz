import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import type { FoodCategory, FoodEstimate, FoodCalculation, ShoppingItem } from '../lib/types'

export function ShoppingTab({ partyId, isAdmin }: { partyId: number; isAdmin: boolean }) {
  const [categories, setCategories] = useState<FoodCategory[]>([])
  const [estimates, setEstimates] = useState<FoodEstimate[]>([])
  const [calculation, setCalculation] = useState<FoodCalculation | null>(null)
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [newItem, setNewItem] = useState('')

  useEffect(() => { load() }, [partyId])

  const load = async () => {
    const [cats, est, calc, itms] = await Promise.all([
      api.foodCategories(),
      api.getFoodEstimates(partyId),
      api.calculateFood(partyId),
      api.getShoppingItems(partyId),
    ])
    setCategories(cats)
    setEstimates(est)
    setCalculation(calc)
    setItems(itms)
  }

  const handleEstimateChange = async (category: string, perNight: number, unit: string) => {
    await api.setFoodEstimate(partyId, { category, perNight, unit })
    load()
  }

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItem.trim()) return
    await api.addShoppingItem(partyId, newItem.trim())
    setNewItem('')
    load()
  }

  const handleToggle = async (id: number) => {
    await api.toggleShoppingItem(partyId, id)
    load()
  }

  const handleDeleteItem = async (id: number) => {
    await api.deleteShoppingItem(partyId, id)
    load()
  }

  const getEstimate = (catKey: string) => estimates.find(e => e.category === catKey)

  return (
    <div className="space-y-8">
      {/* Food calculation */}
      <section>
        <h2 className="section-heading">Kalkulace jídla</h2>

        {calculation && (
          <div className="card p-4 mb-4">
            <div className="flex gap-6 text-sm text-zinc-400">
              <span>Potvrzených: <strong className="text-white">{calculation.confirmedPeople}</strong></span>
              <span>Celkem nocí: <strong className="text-white">{calculation.totalNights}</strong></span>
            </div>
            {calculation.perPerson?.length > 0 && (
              <div className="mt-2 text-xs text-zinc-500">
                {calculation.perPerson.map(p => (
                  <span key={p.user.id} className="mr-3">{p.user.displayName}: {p.nights} nocí</span>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="card overflow-x-auto">
          <table className="w-full text-sm min-w-[400px]">
            <thead>
              <tr className="text-zinc-400 text-left border-b border-white/8">
                <th className="px-3 py-2 w-8"></th>
                <th className="px-3 py-2">Kategorie</th>
                <th className="px-3 py-2 w-24">Na os./noc</th>
                <th className="px-3 py-2 w-20">Jednotka</th>
                <th className="px-3 py-2 w-24">Koupit</th>
              </tr>
            </thead>
            <tbody>
              {categories.map(cat => {
                const est = getEstimate(cat.key)
                const perNight = est?.perNight || 0
                const unit = est?.unit || cat.defaultUnit
                const calcRow = calculation?.amounts?.find(a => a.category === cat.key)

                return (
                  <tr key={cat.key} className={`border-t border-white/8 ${est?.purchased ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-2">
                      <button
                        onClick={async () => {
                          if (!est) return
                          await api.toggleFoodPurchased(partyId, cat.key)
                          load()
                        }}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                          est?.purchased ? 'bg-indigo-600 border-indigo-600' : 'border-zinc-600'
                        }`}
                      >
                        {est?.purchased && <span className="text-white text-xs">✓</span>}
                      </button>
                    </td>
                    <td className={`px-4 py-2 font-medium ${est?.purchased ? 'line-through' : ''}`}>{cat.label}</td>
                    <td className="px-4 py-2">
                      {isAdmin ? (
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={perNight}
                          onChange={e => handleEstimateChange(cat.key, Number(e.target.value), unit)}
                          className="form-input w-20"
                        />
                      ) : (
                        <span>{perNight}</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {isAdmin ? (
                        <select
                          value={unit}
                          onChange={e => handleEstimateChange(cat.key, perNight, e.target.value)}
                          className="form-select"
                        >
                          <option value="ks">ks</option>
                          <option value="l">l</option>
                          <option value="baleni">balení</option>
                          <option value="kg">kg</option>
                        </select>
                      ) : (
                        <span>{unit}</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <span className="font-semibold text-indigo-400">
                        {calcRow ? `${calcRow.totalNeeded} ${unit}` : '–'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Shopping list */}
      <section>
        <h2 className="section-heading">Nákupní seznam</h2>

        <form onSubmit={handleAddItem} className="flex gap-2 mb-4">
          <input
            value={newItem}
            onChange={e => setNewItem(e.target.value)}
            placeholder="Přidat položku..."
            className="form-input flex-1 w-auto"
          />
          <button type="submit" className="btn-primary">Přidat</button>
        </form>

        <div className="space-y-1">
          {items.map(item => (
            <div key={item.id} className="card flex items-center gap-3 p-3">
              <button
                onClick={() => handleToggle(item.id)}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                  item.checked ? 'bg-indigo-600 border-indigo-600' : 'border-zinc-600'
                }`}
              >
                {item.checked && <span className="text-white text-xs">✓</span>}
              </button>
              <span className={`flex-1 ${item.checked ? 'line-through text-zinc-500' : ''}`}>{item.name}</span>
              <button onClick={() => handleDeleteItem(item.id)} className="btn-danger text-xs py-0.5 px-2">Smazat</button>
            </div>
          ))}
          {items.length === 0 && <p className="text-zinc-500 text-sm">Seznam je prázdný</p>}
        </div>
      </section>
    </div>
  )
}
