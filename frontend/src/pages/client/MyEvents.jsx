import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/client'

export default function MyEvents() {
  const [events, setEvents] = useState([])

  useEffect(() => {
    api.get('/client/events').then((r) => setEvents(r.data))
  }, [])

  return (
    <div>
      <h1 className="font-display text-2xl text-stone-800 mb-6">My Events</h1>
      <div className="grid gap-4">
        {events.map((e) => (
          <Link
            key={e.id}
            to={`/portal/events/${e.id}`}
            className="block bg-white rounded-lg border border-stone-200 p-5 hover:border-burley-300 transition"
          >
            <p className="font-medium text-stone-800">{e.venue || 'Venue TBC'}</p>
            <p className="text-sm text-stone-500">{e.event_date || 'Date TBC'} - {e.guest_count || '?'} guests</p>
            <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full bg-burley-50 text-burley-700 capitalize">
              {e.status}
            </span>
          </Link>
        ))}
        {events.length === 0 && <p className="text-stone-400">No events yet - book a consultation to get started.</p>}
      </div>
    </div>
  )
}
