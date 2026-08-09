import { useState } from 'react'
import api from '../../api/client'

export default function LeaveReview() {
  const [content, setContent] = useState('')
  const [rating, setRating] = useState(5)
  const [status, setStatus] = useState(null)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('sending')
    setError(null)
    try {
      await api.post('/client/reviews', { content, rating })
      setStatus('success')
      setContent('')
      setRating(5)
    } catch (err) {
      setError(err.response?.data?.error || 'Could not submit your review.')
      setStatus(null)
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl text-stone-800 mb-2">Leave a Review</h1>
      <p className="text-stone-500 text-sm mb-6">
        We'd love to hear how it went. Your review will be checked before it appears on our site.
      </p>

      {status === 'success' ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-5 text-sm text-stone-700 max-w-lg">
          Thank you for your feedback! We'll review it shortly.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-stone-200 p-6 grid gap-4 max-w-lg">
          <div>
            <label className="text-sm font-medium text-stone-700 block mb-2">Rating</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className={`text-2xl ${n <= rating ? 'text-amber-500' : 'text-stone-300'}`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-stone-700 block mb-1">Your review</label>
            <textarea
              required
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Tell us about your experience..."
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            disabled={status === 'sending'}
            className="rounded-full bg-burley-600 text-white px-6 py-2 text-sm hover:bg-burley-700 disabled:opacity-50 justify-self-start"
          >
            {status === 'sending' ? 'Submitting...' : 'Submit Review'}
          </button>
        </form>
      )}
    </div>
  )
}
