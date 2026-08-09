import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../../api/client'

export default function Quotes() {
  const [searchParams] = useSearchParams()
  const [quotes, setQuotes] = useState([])
  const [services, setServices] = useState([])
  const [clients, setClients] = useState([])
  const [clientId, setClientId] = useState(searchParams.get('client_id') || '')
  const [items, setItems] = useState([{ service_id: '', description: '', quantity: 1, cost_price: '', markup_pct: 35 }])
  const [warnings, setWarnings] = useState([])
  const [error, setError] = useState(null)

  function load() {
    api.get('/admin/quotes').then((r) => setQuotes(r.data))
    api.get('/admin/services').then((r) => setServices(r.data))
    api.get('/admin/clients').then((r) => setClients(r.data))
  }
  useEffect(load, [])

  function updateItem(idx, field, value) {
    const next = [...items]
    next[idx][field] = value
    if (field === 'service_id') {
      const svc = services.find((s) => s.id === Number(value))
      if (svc) {
        next[idx].description = svc.name
        next[idx].cost_price = svc.cost_price
        next[idx].markup_pct = svc.default_markup_pct
      }
    }
    setItems(next)
  }

  function addItem() {
    setItems([...items, { service_id: '', description: '', quantity: 1, cost_price: '', markup_pct: 35 }])
  }

  async function sendQuote(quoteId) {
    try {
      await api.post(`/admin/quotes/${quoteId}/send`)
      load()
    } catch (err) {
      alert(err.response?.data?.error || 'Could not send this quote.')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setWarnings([])
    try {
      const res = await api.post('/admin/quotes', {
        client_id: Number(clientId),
        items: items.map((i) => ({ ...i, service_id: i.service_id ? Number(i.service_id) : null })),
      })
      if (res.data.margin_warnings) setWarnings(res.data.margin_warnings)
      setClientId('')
      setItems([{ service_id: '', description: '', quantity: 1, cost_price: '', markup_pct: 35 }])
      load()
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create quote.')
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-stone-800 mb-8">Quotes</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-lg border border-stone-200 overflow-hidden h-fit">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-stone-500 text-left">
              <tr>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">v</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Margin</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {quotes.map((q) => {
                const client = clients.find((c) => c.id === q.client_id)
                return (
                  <tr key={q.id} className={q.is_below_margin_floor ? 'bg-amber-50' : ''}>
                    <td className="px-4 py-3">
                      {client ? client.name : `#${q.client_id}`}
                      {q.requested_by_client && (
                        <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
                          Requested by client
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">{q.version}</td>
                    <td className="px-4 py-3 capitalize">{q.status}</td>
                    <td className="px-4 py-3">KES {q.total_price?.toLocaleString()}</td>
                    <td className="px-4 py-3">{q.margin_pct !== null ? `${q.margin_pct}%` : '-'}</td>
                    <td className="px-4 py-3">
                      {q.status === 'draft' && (
                        <button
                          onClick={() => sendQuote(q.id)}
                          className="text-burley-600 text-xs hover:underline"
                        >
                          Send to client
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
              {quotes.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-stone-400">No quotes yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-stone-200 p-5 grid gap-3 h-fit">
          <h2 className="font-semibold text-stone-800">New Quote</h2>
          <select
            required
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
          >
            <option value="">Select client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
            ))}
          </select>
          {items.map((item, idx) => (
            <div key={idx} className="border border-stone-100 rounded-lg p-3 grid gap-2">
              <select
                value={item.service_id}
                onChange={(e) => updateItem(idx, 'service_id', e.target.value)}
                className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
              >
                <option value="">Custom item</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <input
                placeholder="Description"
                value={item.description}
                onChange={(e) => updateItem(idx, 'description', e.target.value)}
                className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  placeholder="Qty"
                  value={item.quantity}
                  onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                  className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
                />
                <input
                  type="number"
                  placeholder="Cost"
                  value={item.cost_price}
                  onChange={(e) => updateItem(idx, 'cost_price', e.target.value)}
                  className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
                />
                <input
                  type="number"
                  placeholder="Markup %"
                  value={item.markup_pct}
                  onChange={(e) => updateItem(idx, 'markup_pct', e.target.value)}
                  className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
                />
              </div>
            </div>
          ))}
          <button type="button" onClick={addItem} className="text-burley-600 text-xs text-left hover:underline">
            + Add another item
          </button>
          {warnings.length > 0 && (
            <div className="text-amber-600 text-xs">
              {warnings.map((w, i) => (
                <p key={i}>{w.description}: {w.warning}</p>
              ))}
            </div>
          )}
          {error && <p className="text-red-600 text-xs">{error}</p>}
          <button className="rounded-full bg-burley-600 text-white px-4 py-2 text-sm hover:bg-burley-700">
            Create Quote
          </button>
        </form>
      </div>
    </div>
  )
}
