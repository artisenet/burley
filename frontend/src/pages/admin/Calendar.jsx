import { useEffect, useState } from 'react'
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

export default function Calendar() {
  const [cursor, setCursor] = useState(new Date())
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(null)

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

  const itemsByDate = {}
  items.forEach((item) => {
    if (!itemsByDate[item.date]) itemsByDate[item.date] = []
    itemsByDate[item.date].push(item)
  })

  const cells = []
  for (let i = 0; i < leadingBlanks; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const selectedItems = selectedDate ? itemsByDate[selectedDate] || [] : []

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

      <div className="flex items-center gap-4 mb-4 text-xs text-stone-500">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500 inline-block" /> Consultation</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-burley-600 inline-block" /> Event</span>
      </div>

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
            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                className={`aspect-square rounded-lg border text-left p-1.5 flex flex-col ${
                  isSelected ? 'border-burley-500 bg-burley-50' : 'border-stone-200 hover:bg-stone-50'
                }`}
              >
                <span className="text-xs text-stone-600">{day}</span>
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
                <div key={`${item.type}-${item.id}`} className="py-2 flex justify-between items-center text-sm">
                  <span className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${item.type === 'consultation' ? 'bg-blue-500' : 'bg-burley-600'}`} />
                    {item.title}
                    {item.time && <span className="text-stone-400">- {item.time}</span>}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 capitalize">
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
