import { useState } from 'react'
import api from '../../api/client'

const CATEGORIES = ['Full Planning', 'Decor', 'Catering Coordination', 'Photography Liaison', 'Rentals', 'Other']

export default function RequestQuote() {
  const [form, setForm] = useState({ category: CATEGORIES[0], event_date: '', guest_count: '', notes: '' })
  const [status, setStatus] = useState(null)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('sending')
    setError(null)
    try {
      await api.post('/client/quote-requests', form)
      setStatus('success')
      setForm({ category: CATEGORIES[0], event_date: '', guest_count: '', notes: '' })
    } catch (err) {
      setError(err.response?.data?.error || 'Could not submit your request, please try again.')
      setStatus(null)
    }
  }

  if (status === 'success') {
    return (
      <div>
        <h1 className="font-display text-2xl text-stone-800 mb-4">Request submitted</h1>
        <div className="bg-green-50 border border-green-200 rounded-lg p-5 text-sm text-stone-700">
          Thank you - we've received your request and will follow up with a quote shortly.
        </div>
        <button
          onClick={() => setStatus(null)}
          className="mt-4 text-burley-600 text-sm hover:underline"
        >
          Submit another request
        </button>
      </div>
    )
  }

  return (
    <div>
      <h1 className="font-display text-2xl text-stone-800 mb-2">Request a Quote</h1>
      <p className="text-stone-500 text-sm mb-6">
        Planning something new, or want to add to an existing booking? Tell us a little about it and we'll follow up with a quote.
      </p>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-stone-200 p-6 grid gap-4 max-w-lg">
        <div>
          <label className="text-sm font-medium text-stone-700 block mb-1">What are you interested in?</label>
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-stone-700 block mb-1">Preferred date (optional)</label>
          <input
            type="date"
            value={form.event_date}
            onChange={(e) => setForm({ ...form, event_date: e.target.value })}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-stone-700 block mb-1">Guest count (optional)</label>
          <input
            type="number"
            min="1"
            value={form.guest_count}
            onChange={(e) => setForm({ ...form, guest_count: e.target.value })}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-stone-700 block mb-1">Tell us more</label>
          <textarea
            rows={4}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Venue ideas, style, budget range, anything that helps us prepare a quote"
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          disabled={status === 'sending'}
          className="rounded-full bg-burley-600 text-white px-6 py-2 text-sm hover:bg-burley-700 disabled:opacity-50 justify-self-start"
        >
          {status === 'sending' ? 'Submitting...' : 'Submit request'}
        </button>
      </form>
    </div>
  )
}
