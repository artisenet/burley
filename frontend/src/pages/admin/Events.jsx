import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/client'

export default function Events() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/events').then((r) => setEvents(r.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-stone-500">Loading events...</p>

  return (
    <div>
      <h1 className="font-display text-3xl text-stone-800 mb-8">Events</h1>
      <div className="bg-white rounded-lg border border-stone-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-stone-500 text-left">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Venue</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Revenue</th>
              <th className="px-4 py-3">Actual Cost</th>
              <th className="px-4 py-3">Margin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {events.map((e) => {
              const p = e.profitability
              const flagged = p?.below_margin_floor
              return (
                <tr
                  key={e.id}
                  className={`cursor-pointer hover:bg-stone-50 ${flagged ? 'bg-amber-50' : ''}`}
                >
                  <td className="px-4 py-3">
                    <Link to={`/admin/events/${e.id}`} className="block">{e.event_date || 'TBC'}</Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/admin/events/${e.id}`} className="block">{e.venue || 'TBC'}</Link>
                  </td>
                  <td className="px-4 py-3 capitalize">{e.status}</td>
                  <td className="px-4 py-3">KES {p?.revenue?.toLocaleString() ?? 0}</td>
                  <td className="px-4 py-3">KES {p?.actual_cost?.toLocaleString() ?? 0}</td>
                  <td className={`px-4 py-3 font-medium ${flagged ? 'text-amber-700' : 'text-green-700'}`}>
                    {p?.margin_pct !== null && p?.margin_pct !== undefined ? (
                      <>
                        {p.margin_pct}%
                        {p.margin_is_estimated && (
                          <span className="text-stone-400 font-normal text-xs ml-1">(est.)</span>
                        )}
                      </>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              )
            })}
            {events.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-stone-400">
                  No events yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
