import { useEffect, useState } from 'react'
import api from '../../api/client'

const STATUS_STYLES = {
  draft: 'bg-stone-100 text-stone-600',
  sent: 'bg-amber-100 text-amber-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  expired: 'bg-stone-100 text-stone-500',
}

export default function MyQuotes() {
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [actingOn, setActingOn] = useState(null)
  const [error, setError] = useState(null)

  function load() {
    api.get('/client/quotes').then((r) => setQuotes(r.data)).finally(() => setLoading(false))
  }
  useEffect(load, [])

  async function accept(quoteId) {
    setActingOn(quoteId)
    setError(null)
    try {
      await api.post(`/client/quotes/${quoteId}/accept`)
      load()
    } catch (err) {
      setError(err.response?.data?.error || 'Could not accept this quote.')
    } finally {
      setActingOn(null)
    }
  }

  async function reject(quoteId) {
    if (!confirm('Are you sure you want to decline this quote?')) return
    setActingOn(quoteId)
    setError(null)
    try {
      await api.post(`/client/quotes/${quoteId}/reject`)
      load()
    } catch (err) {
      setError(err.response?.data?.error || 'Could not decline this quote.')
    } finally {
      setActingOn(null)
    }
  }

  if (loading) return <p className="text-stone-500">Loading...</p>

  return (
    <div>
      <h1 className="font-display text-2xl text-stone-800 mb-6">My Quotes</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
          {error}
        </div>
      )}

      <div className="grid gap-5">
        {quotes.map((q) => (
          <div key={q.id} className="bg-white rounded-lg border border-stone-200 p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="font-medium text-stone-800">Quote #{q.id} - version {q.version}</p>
                <p className="text-sm text-stone-500">
                  {new Date(q.created_at).toLocaleDateString()}
                </p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full capitalize ${STATUS_STYLES[q.status] || ''}`}>
                {q.status}
              </span>
            </div>

            <div className="divide-y divide-stone-100 border-y border-stone-100 mb-4">
              {q.items?.map((item) => (
                <div key={item.id} className="py-2 flex justify-between text-sm">
                  <span className="text-stone-600">
                    {item.description} &times; {item.quantity}
                  </span>
                  <span className="font-medium text-stone-800">
                    KES {Number(item.total_price).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center">
              <p className="font-semibold text-stone-800">
                Total: KES {q.total_price.toLocaleString()}
              </p>

              {q.status === 'sent' && (
                <div className="flex gap-3">
                  <button
                    onClick={() => reject(q.id)}
                    disabled={actingOn === q.id}
                    className="rounded-full border border-stone-300 text-stone-600 text-sm px-4 py-2 hover:bg-stone-50 disabled:opacity-50"
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => accept(q.id)}
                    disabled={actingOn === q.id}
                    className="rounded-full bg-burley-600 text-white text-sm px-4 py-2 hover:bg-burley-700 disabled:opacity-50"
                  >
                    {actingOn === q.id ? 'Accepting...' : 'Accept Quote'}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {quotes.length === 0 && (
          <p className="text-stone-400">No quotes yet - these will appear here once we send you one.</p>
        )}
      </div>
    </div>
  )
}
