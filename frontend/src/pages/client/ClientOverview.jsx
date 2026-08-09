import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/client'

export default function ClientOverview() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/client/dashboard').then((r) => setData(r.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-stone-500">Loading...</p>
  if (!data) return null

  const hasAttentionItems =
    data.pending_quotes.length > 0 || data.outstanding_invoice_count > 0

  return (
    <div>
      <h1 className="font-display text-2xl text-stone-800 mb-6">Welcome back</h1>

      {hasAttentionItems && (
        <div className="grid gap-4 mb-10">
          {data.pending_quotes.map((q) => (
            <div
              key={q.id}
              className="bg-amber-50 border border-amber-200 rounded-lg p-5 flex justify-between items-center"
            >
              <div>
                <p className="font-medium text-stone-800">A quote is waiting for your review</p>
                <p className="text-sm text-stone-500">
                  KES {q.total_price.toLocaleString()} - version {q.version}
                </p>
              </div>
              <Link
                to="/portal/quotes"
                className="rounded-full bg-amber-600 text-white text-sm px-4 py-2 hover:bg-amber-700"
              >
                Review Quote
              </Link>
            </div>
          ))}

          {data.next_payment && (
            <div className="bg-burley-50 border border-burley-200 rounded-lg p-5 flex justify-between items-center">
              <div>
                <p className="font-medium text-stone-800">
                  Payment due: {data.next_payment.label}
                </p>
                <p className="text-sm text-stone-500">
                  KES {Number(data.next_payment.amount_due).toLocaleString()}
                  {data.next_payment.due_date ? ` - due ${data.next_payment.due_date}` : ''}
                </p>
              </div>
              <Link
                to="/portal/invoices"
                className="rounded-full bg-burley-600 text-white text-sm px-4 py-2 hover:bg-burley-700"
              >
                Pay Now
              </Link>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <StatCard label="Upcoming Events" value={data.upcoming_events.length} />
        <StatCard label="Quotes Awaiting Review" value={data.pending_quotes.length} />
        <StatCard
          label="Outstanding Balance"
          value={`KES ${data.outstanding_total.toLocaleString()}`}
        />
      </div>

      <h2 className="font-semibold text-lg text-stone-800 mb-3">Upcoming Events</h2>
      <div className="bg-white rounded-lg border border-stone-200 divide-y divide-stone-100">
        {data.upcoming_events.map((e) => (
          <div key={e.id} className="px-5 py-4 flex justify-between items-center">
            <div>
              <p className="font-medium text-stone-800">{e.venue || 'Venue to be confirmed'}</p>
              <p className="text-xs text-stone-500">{e.event_date || 'Date to be confirmed'}</p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-burley-50 text-burley-700 capitalize">
              {e.status}
            </span>
          </div>
        ))}
        {data.upcoming_events.length === 0 && (
          <p className="px-5 py-6 text-stone-400">
            No upcoming events yet - book a consultation to get started.
          </p>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-lg border border-stone-200 p-5 bg-white">
      <p className="text-stone-500 text-sm mb-1">{label}</p>
      <p className="text-2xl font-semibold text-stone-800">{value}</p>
    </div>
  )
}
