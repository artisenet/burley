import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api, { downloadFile } from '../../api/client'

const TIMELINE_STEPS = ['inquiry', 'confirmed', 'in_progress', 'completed']

const STEP_LABELS = {
  inquiry: 'Inquiry Received',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
}

export default function EventDetail() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api
      .get(`/client/events/${id}`)
      .then((r) => setData(r.data))
      .catch((err) => setError(err.response?.data?.error || 'Could not load this event.'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <p className="text-stone-500">Loading...</p>
  if (error) return <p className="text-red-600">{error}</p>
  if (!data) return null

  const { event, quote, invoice } = data
  const isCancelled = event.status === 'cancelled'
  const currentStepIndex = TIMELINE_STEPS.indexOf(event.status)

  return (
    <div>
      <Link to="/portal/events" className="text-sm text-burley-600 hover:underline mb-4 inline-block">
        &larr; Back to My Events
      </Link>

      <h1 className="font-display text-2xl text-stone-800 mb-1">{event.venue || 'Venue to be confirmed'}</h1>
      <p className="text-stone-500 mb-2">
        {event.event_date || 'Date to be confirmed'} - {event.guest_count || '?'} guests
      </p>
      <button
        onClick={async () => {
          try {
            await downloadFile(`/client/events/${event.id}/contract.pdf`, `contract-event-${event.id}.pdf`)
          } catch (err) {
            alert(err.message)
          }
        }}
        className="text-xs text-burley-600 hover:underline mb-6 inline-block"
      >
        Download Contract PDF
      </button>

      {/* Timeline */}
      {!isCancelled ? (
        <div className="mb-10">
          <div className="flex items-center">
            {TIMELINE_STEPS.map((step, i) => (
              <div key={step} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium ${
                      i <= currentStepIndex
                        ? 'bg-burley-600 text-white'
                        : 'bg-stone-200 text-stone-400'
                    }`}
                  >
                    {i + 1}
                  </div>
                  <span
                    className={`text-xs mt-2 whitespace-nowrap ${
                      i <= currentStepIndex ? 'text-burley-700 font-medium' : 'text-stone-400'
                    }`}
                  >
                    {STEP_LABELS[step]}
                  </span>
                </div>
                {i < TIMELINE_STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 ${
                      i < currentStepIndex ? 'bg-burley-600' : 'bg-stone-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-10 text-sm">
          This event has been cancelled.
        </div>
      )}

      {/* What's included */}
      <div className="mb-8">
        <h2 className="font-semibold text-lg text-stone-800 mb-3">What's Included</h2>
        {quote ? (
          <div className="bg-white rounded-lg border border-stone-200 divide-y divide-stone-100">
            {quote.items?.map((item) => (
              <div key={item.id} className="px-5 py-3 flex justify-between text-sm">
                <span className="text-stone-700">
                  {item.description} &times; {item.quantity}
                </span>
                <span className="font-medium text-stone-800">
                  KES {Number(item.total_price).toLocaleString()}
                </span>
              </div>
            ))}
            <div className="px-5 py-3 flex justify-between font-semibold">
              <span>Total</span>
              <span>KES {quote.total_price.toLocaleString()}</span>
            </div>
          </div>
        ) : (
          <p className="text-stone-400 text-sm">
            No quote linked to this event yet - details will appear here once one is attached.
          </p>
        )}
      </div>

      {/* Payment status */}
      <div>
        <h2 className="font-semibold text-lg text-stone-800 mb-3">Payment Status</h2>
        {invoice ? (
          <div className="bg-white rounded-lg border border-stone-200 p-5">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-stone-500">Invoice #{invoice.id}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                  invoice.status === 'paid'
                    ? 'bg-green-100 text-green-700'
                    : invoice.status === 'partial'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-stone-100 text-stone-600'
                }`}
              >
                {invoice.status}
              </span>
            </div>
            <div className="divide-y divide-stone-100 border-t border-stone-100">
              {invoice.schedule_items.map((s) => (
                <div key={s.id} className="py-2 flex justify-between text-sm">
                  <span className="capitalize text-stone-600">{s.label}</span>
                  <span className={s.status === 'paid' ? 'text-green-600' : 'text-stone-700'}>
                    KES {Number(s.amount_due).toLocaleString()} - {s.status}
                  </span>
                </div>
              ))}
            </div>
            <Link
              to="/portal/invoices"
              className="inline-block mt-4 text-burley-600 text-sm hover:underline"
            >
              Go to Invoices &rarr;
            </Link>
          </div>
        ) : (
          <p className="text-stone-400 text-sm">No invoice linked to this event yet.</p>
        )}
      </div>
    </div>
  )
}
