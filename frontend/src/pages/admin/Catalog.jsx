import { useEffect, useState } from 'react'
import api from '../../api/client'

export default function Catalog() {
  const [categories, setCategories] = useState([])
  const [services, setServices] = useState([])
  const [form, setForm] = useState({ name: '', category_id: '', cost_price: '', default_markup_pct: 35, unit: 'flat' })
  const [warning, setWarning] = useState(null)
  const [error, setError] = useState(null)

  function load() {
    api.get('/admin/categories').then((r) => setCategories(r.data))
    api.get('/admin/services').then((r) => setServices(r.data))
  }

  useEffect(load, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setWarning(null)
    try {
      const res = await api.post('/admin/services', form)
      if (res.data.margin_warning) setWarning(res.data.margin_warning)
      setForm({ name: '', category_id: '', cost_price: '', default_markup_pct: 35, unit: 'flat' })
      load()
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create service.')
    }
  }

  const sellingPrice =
    form.cost_price && form.default_markup_pct
      ? (Number(form.cost_price) * (1 + Number(form.default_markup_pct) / 100)).toFixed(2)
      : null

  return (
    <div>
      <h1 className="font-display text-3xl text-stone-800 mb-8">Services & Pricing</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-lg border border-stone-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-stone-500 text-left">
              <tr>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">Cost</th>
                <th className="px-4 py-3">Markup</th>
                <th className="px-4 py-3">Selling Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {services.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3">{s.name}</td>
                  <td className="px-4 py-3">KES {s.cost_price}</td>
                  <td className="px-4 py-3">{s.default_markup_pct}%</td>
                  <td className="px-4 py-3 font-medium">KES {s.default_selling_price}</td>
                </tr>
              ))}
              {services.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-stone-400">
                    No services yet - add your first one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-stone-200 p-5 grid gap-3 h-fit">
          <h2 className="font-semibold text-stone-800">Add a Service</h2>
          <input
            required
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
          <select
            required
            value={form.category_id}
            onChange={(e) => setForm({ ...form, category_id: e.target.value })}
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
          >
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <input
            required
            type="number"
            step="0.01"
            placeholder="Cost price (KES)"
            value={form.cost_price}
            onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
          <input
            required
            type="number"
            step="0.1"
            placeholder="Markup %"
            value={form.default_markup_pct}
            onChange={(e) => setForm({ ...form, default_markup_pct: e.target.value })}
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
          {sellingPrice && (
            <p className="text-sm text-stone-500">Selling price: <strong>KES {sellingPrice}</strong></p>
          )}
          {warning && <p className="text-amber-600 text-xs">{warning}</p>}
          {error && <p className="text-red-600 text-xs">{error}</p>}
          <button className="rounded-full bg-burley-600 text-white px-4 py-2 text-sm hover:bg-burley-700">
            Add Service
          </button>
        </form>
      </div>
    </div>
  )
}
