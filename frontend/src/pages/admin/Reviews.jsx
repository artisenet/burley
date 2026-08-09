import { useEffect, useState } from 'react'
import api from '../../api/client'

const TABS = ['pending', 'approved', 'rejected']

export default function Reviews() {
  const [reviews, setReviews] = useState([])
  const [tab, setTab] = useState('pending')
  const [loading, setLoading] = useState(true)

  function load(status) {
    setLoading(true)
    api.get('/admin/reviews', { params: { status } }).then((r) => setReviews(r.data)).finally(() => setLoading(false))
  }
  useEffect(() => load(tab), [tab])

  async function moderate(reviewId, status) {
    await api.put(`/admin/reviews/${reviewId}`, { status })
    load(tab)
  }

  async function remove(reviewId) {
    if (!confirm('Delete this review permanently?')) return
    await api.delete(`/admin/reviews/${reviewId}`)
    load(tab)
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-stone-800 mb-6">Reviews</h1>

      <div className="flex gap-2 mb-6">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-sm px-4 py-1.5 rounded-full capitalize ${
              tab === t ? 'bg-burley-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-stone-500">Loading...</p>
      ) : (
        <div className="grid gap-3">
          {reviews.map((r) => (
            <div key={r.id} className="bg-white rounded-lg border border-stone-200 p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium text-stone-800 text-sm">{r.name}</p>
                  {r.rating && (
                    <p className="text-amber-500 text-xs">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</p>
                  )}
                </div>
                <span className="text-xs text-stone-400 capitalize">{r.source.replace('_', ' ')}</span>
              </div>
              <p className="text-sm text-stone-600 mb-3">{r.content}</p>
              <div className="flex gap-3 text-xs">
                {r.status !== 'approved' && (
                  <button onClick={() => moderate(r.id, 'approved')} className="text-green-600 hover:underline">Approve</button>
                )}
                {r.status !== 'rejected' && (
                  <button onClick={() => moderate(r.id, 'rejected')} className="text-amber-600 hover:underline">Reject</button>
                )}
                <button onClick={() => remove(r.id)} className="text-red-500 hover:underline">Delete</button>
              </div>
            </div>
          ))}
          {reviews.length === 0 && <p className="text-stone-400">No {tab} reviews.</p>}
        </div>
      )}
    </div>
  )
}
