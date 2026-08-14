import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/client'

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}
function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}
function toISODate(date) {
  return date.toISOString().slice(0, 10)
}
function todayISO() {
  return toISODate(new Date())
}

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'consultation', label: 'Consultations' },
  { key: 'event', label: 'Events' },
]

const STATUS_STYLES = {
  pending: 'bg-stone-100 text-stone-600',
  confirmed: 'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-700',
  no_show: 'bg-amber-100 text-amber-700',
  inquiry: 'bg-stone-100 text-stone-600',
  in_progress: 'bg-blue-100 text-blue-700',
}

export default function Calendar() {
  const [cursor, setCursor] = useState(new Date())
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(null)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    const start = startOfMonth(cursor)
    const end = endOfMonth(cursor)
    setLoading(true)
    api
      .get('/admin/calendar', { params: { start: toISODate(start), end: toISODate(end) } })
      .then((r) => setItems(r.data))
      .finally(() => setLoading(false))
  }, [cursor])

  const monthStart = startOfMonth(cursor)
  const monthEnd = endOfMonth(cursor)
  const leadingBlanks = monthStart.getDay()
  const daysInMonth = monthEnd.getDate()
  const today = todayISO()

  const filteredItems = filter === 'all' ? items : items.filter((i) => i.type === filter)

  const itemsByDate = {}
  filteredItems.forEach((item) => {
    if (!itemsByDate[item.date]) itemsByDate[item.date] = []
    itemsByDate[item.date].push(item)
  })

  const cells = []
  for (let i = 0; i < leadingBlanks; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const selectedItems = selectedDate ? (itemsByDate[selectedDate] || []).sort((a, b) => (a.time || '').localeCompare(b.time || '')) : []

  // Upcoming agenda: next 7 days from today, across the currently-loaded items
  const upcoming = filteredItems
    .filter((i) => i.date >= today)
    .sort((a, b) => (a.date + (a.time || '00:00')).localeCompare(b.date + (b.time || '00:00')))
    .slice(0, 8)

  const consultCount = items.filter((i) => i.type === 'consultation').length
  const eventCount = items.filter((i) => i.type === 'event').length

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-display text-3xl text-stone-800">Calendar</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            className="rounded-full border border-stone-300 px-3 py-1 text-sm hover:bg-stone-50"
          >
            &larr;
          </button>
          <span className="font-medium text-stone-700 w-36 text-center">
            {cursor.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </span>
          <button
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            className="rounded-full border border-stone-300 px-3 py-1 text-sm hover:bg-stone-50"
          >
            &rarr;
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4 text-xs text-stone-500">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500 inline-block" /> Consultation ({consultCount})</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-burley-600 inline-block" /> Event ({eventCount})</span>
        </div>
        <div className="flex gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`text-xs px-3 py-1 rounded-full ${
                filter === f.key ? 'bg-burley-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {loading ? (
            <p className="text-stone-500">Loading...</p>
          ) : (
            <div className="grid grid-cols-7 gap-1 mb-6">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="text-center text-xs text-stone-400 py-1">{d}</div>
              ))}
              {cells.map((day, idx) => {
                if (day === null) return <div key={`blank-${idx}`} />
                const dateStr = toISODate(new Date(cursor.getFullYear(), cursor.getMonth(), day))
                const dayItems = itemsByDate[dateStr] || []
                const isSelected = selectedDate === dateStr
                const isToday = dateStr === today
                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`aspect-square rounded-lg border text-left p-1.5 flex flex-col relative ${
                      isSelected ? 'border-burley-500 bg-burley-50' : isToday ? 'border-burley-300' : 'border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    <span className={`text-xs ${isToday ? 'font-bold text-burley-700' : 'text-stone-600'}`}>{day}</span>
                    <div className="flex flex-wrap gap-0.5 mt-auto">
                      {dayItems.slice(0, 4).map((item, i) => (
                        <span
                          key={i}
                          className={`h-1.5 w-1.5 rounded-full ${
                            item.type === 'consultation' ? 'bg-blue-500' : 'bg-burley-600'
                          }`}
                        />
                      ))}
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {selectedDate && (
            <div className="bg-white rounded-lg border border-stone-200 p-5">
              <p className="font-medium text-stone-800 mb-3">
                {new Date(selectedDate).toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
              {selectedItems.length === 0 ? (
                <p className="text-stone-400 text-sm">Nothing scheduled this day.</p>
              ) : (
                <div className="divide-y divide-stone-100">
                  {selectedItems.map((item) => (
                    <DayItemRow key={`${item.type}-${item.id}`} item={item} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-stone-200 p-5 h-fit">
          <h2 className="font-semibold text-stone-800 mb-4">Upcoming (next 7)</h2>
          <div className="grid gap-3">
            {upcoming.map((item) => (
              <div key={`${item.type}-${item.id}`} className="text-sm">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full flex-shrink-0 ${item.type === 'consultation' ? 'bg-blue-500' : 'bg-burley-600'}`} />
                  <span className="font-medium text-stone-800 truncate">{item.title}</span>
                </div>
                <p className="text-xs text-stone-500 ml-4">
                  {new Date(item.date).toLocaleDateString('default', { month: 'short', day: 'numeric' })}
                  {item.time && ` at ${item.time}`}
                  {item.subtitle && ` - ${item.subtitle}`}
                </p>
              </div>
            ))}
            {upcoming.length === 0 && <p className="text-stone-400 text-sm">Nothing coming up.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

function DayItemRow({ item }) {
  const content = (
    <div className="py-3 flex justify-between items-start gap-3">
      <div className="flex items-start gap-2 min-w-0">
        <span className={`h-2 w-2 rounded-full mt-1.5 flex-shrink-0 ${item.type === 'consultation' ? 'bg-blue-500' : 'bg-burley-600'}`} />
        <div className="min-w-0">
          <p className="font-medium text-stone-800 text-sm truncate">{item.title}</p>
          <p className="text-xs text-stone-500">
            {item.time && `${item.time} - `}{item.subtitle}
          </p>
          {(item.phone || item.email) && (
            <p className="text-xs text-stone-400 mt-0.5">{item.phone}{item.phone && item.email ? ' - ' : ''}{item.email}</p>
          )}
          {item.type === 'event' && item.guest_count && (
            <p className="text-xs text-stone-400 mt-0.5">{item.guest_count} guests</p>
          )}
          {item.type === 'consultation' && (
            <p className="text-xs text-stone-400 mt-0.5">
              {item.fee_waived ? 'Fee waived' : item.fee_paid ? 'Fee paid' : 'Fee pending'}
            </p>
          )}
        </div>
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-full capitalize whitespace-nowrap ${STATUS_STYLES[item.status] || 'bg-stone-100 text-stone-600'}`}>
        {item.status?.replace('_', ' ')}
      </span>
    </div>
  )

  if (item.type === 'event') {
    return (
      <Link to={`/admin/events/${item.id}`} className="block hover:bg-stone-50 -mx-2 px-2 rounded">
        {content}
      </Link>
    )
  }
  return content
}
