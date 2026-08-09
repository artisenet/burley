import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api, { downloadFile } from '../../api/client'

export default function EventDetail() {
  const { id } = useParams()
  const [event, setEvent] = useState(null)
  const [staffList, setStaffList] = useState([])
  const [vendorList, setVendorList] = useState([])
  const [loading, setLoading] = useState(true)
  const [editForm, setEditForm] = useState({ venue: '', event_date: '', guest_count: '', status: 'inquiry' })
  const [saving, setSaving] = useState(false)

  const [staffForm, setStaffForm] = useState({ user_id: '', role: '', agreed_rate: '' })
  const [vendorForm, setVendorForm] = useState({ vendor_id: '', service_description: '', agreed_cost: '' })
  const [expenseForm, setExpenseForm] = useState({ category: '', description: '', amount: '' })

  function load() {
    api.get(`/admin/events/${id}`).then((r) => {
      setEvent(r.data)
      setEditForm({
        venue: r.data.venue || '',
        event_date: r.data.event_date || '',
        guest_count: r.data.guest_count || '',
        status: r.data.status,
      })
    }).finally(() => setLoading(false))
    api.get('/admin/staff').then((r) => setStaffList(r.data))
    api.get('/admin/vendors').then((r) => setVendorList(r.data))
  }
  useEffect(load, [id])

  async function saveDetails(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.put(`/admin/events/${id}`, editForm)
      load()
    } catch (err) {
      alert(err.response?.data?.error || 'Could not save changes.')
    } finally {
      setSaving(false)
    }
  }

  async function addStaff(e) {
    e.preventDefault()
    if (!staffForm.user_id) return
    try {
      await api.post(`/admin/events/${id}/staff`, {
        user_id: Number(staffForm.user_id),
        role: staffForm.role,
        agreed_rate: staffForm.agreed_rate || undefined,
      })
      setStaffForm({ user_id: '', role: '', agreed_rate: '' })
      load()
    } catch (err) {
      alert(err.response?.data?.error || 'Could not assign staff.')
    }
  }

  async function addVendor(e) {
    e.preventDefault()
    if (!vendorForm.vendor_id || !vendorForm.agreed_cost) return
    try {
      await api.post(`/admin/events/${id}/vendors`, {
        vendor_id: Number(vendorForm.vendor_id),
        service_description: vendorForm.service_description,
        agreed_cost: Number(vendorForm.agreed_cost),
      })
      setVendorForm({ vendor_id: '', service_description: '', agreed_cost: '' })
      load()
    } catch (err) {
      alert(err.response?.data?.error || 'Could not assign vendor.')
    }
  }

  async function addExpense(e) {
    e.preventDefault()
    if (!expenseForm.amount) return
    try {
      await api.post('/admin/expenses', { ...expenseForm, event_id: Number(id), amount: Number(expenseForm.amount) })
      setExpenseForm({ category: '', description: '', amount: '' })
      load()
    } catch (err) {
      alert(err.response?.data?.error || 'Could not log expense.')
    }
  }

  if (loading) return <p className="text-stone-500">Loading...</p>
  if (!event) return null

  const p = event.profitability

  return (
    <div>
      <Link to="/admin/events" className="text-sm text-burley-600 hover:underline mb-4 inline-block">
        &larr; Back to Events
      </Link>

      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="font-display text-3xl text-stone-800">{event.venue || `Event #${event.id}`}</h1>
          <p className="text-stone-500 text-sm mt-1">
            {event.client ? `${event.client.name} - ${event.client.email}` : 'No client on file'}
          </p>
          <button
            onClick={async () => {
              try {
                await downloadFile(`/admin/events/${event.id}/contract.pdf`, `contract-event-${event.id}.pdf`)
              } catch (err) {
                alert(err.message)
              }
            }}
            className="text-xs text-burley-600 hover:underline mt-2"
          >
            Download Contract PDF
          </button>
        </div>
        {p?.margin_pct !== null && p?.margin_pct !== undefined && (
          <div className={`text-right px-4 py-2 rounded-lg ${p.below_margin_floor ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'}`}>
            <p className="text-xs text-stone-500">{p.margin_is_estimated ? 'Estimated margin (from quote)' : 'Actual margin'}</p>
            <p className={`text-xl font-semibold ${p.below_margin_floor ? 'text-amber-700' : 'text-green-700'}`}>{p.margin_pct}%</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <form onSubmit={saveDetails} className="bg-white rounded-lg border border-stone-200 p-5 grid gap-3">
          <h2 className="font-semibold text-stone-800 mb-1">Event Details</h2>
          <input
            placeholder="Venue"
            value={editForm.venue}
            onChange={(e) => setEditForm({ ...editForm, venue: e.target.value })}
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={editForm.event_date}
            onChange={(e) => setEditForm({ ...editForm, event_date: e.target.value })}
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            placeholder="Guest count"
            value={editForm.guest_count}
            onChange={(e) => setEditForm({ ...editForm, guest_count: e.target.value })}
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
          <select
            value={editForm.status}
            onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
          >
            {['inquiry', 'confirmed', 'in_progress', 'completed', 'cancelled'].map((s) => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
          <button disabled={saving} className="rounded-full bg-burley-600 text-white px-4 py-2 text-sm hover:bg-burley-700 disabled:opacity-50 justify-self-start">
            {saving ? 'Saving...' : 'Save details'}
          </button>
        </form>

        <div className="bg-white rounded-lg border border-stone-200 p-5">
          <h2 className="font-semibold text-stone-800 mb-3">Profitability</h2>
          {p ? (
            <div className="grid gap-1.5 text-sm">
              <div className="flex justify-between"><span className="text-stone-500">Revenue</span><span>KES {p.revenue.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Expenses</span><span>KES {p.expense_total.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Staff costs</span><span>KES {p.staff_total.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Vendor costs</span><span>KES {p.vendor_total.toLocaleString()}</span></div>
              <div className="flex justify-between font-medium border-t border-stone-100 pt-1.5 mt-1"><span>Actual cost</span><span>KES {p.actual_cost.toLocaleString()}</span></div>
              <div className="flex justify-between font-medium"><span>Profit</span><span>KES {p.profit.toLocaleString()}</span></div>
            </div>
          ) : (
            <p className="text-stone-400 text-sm">No data yet.</p>
          )}
          {p?.actual_cost === 0 && (
            <p className="text-xs text-stone-400 mt-3">
              No costs logged yet - margin above is estimated from the quote. Log staff, vendor, or expense costs below for an actual figure.
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-stone-200 p-5">
          <h2 className="font-semibold text-stone-800 mb-3">Staff</h2>
          <div className="grid gap-2 mb-4">
            {event.staff_assignments.map((a) => (
              <div key={a.id} className="text-sm flex justify-between border-b border-stone-100 pb-1.5">
                <span>{a.staff_name || `#${a.user_id}`} {a.role ? `(${a.role})` : ''}</span>
                <span className="text-stone-500">KES {Number(a.agreed_rate).toLocaleString()}</span>
              </div>
            ))}
            {event.staff_assignments.length === 0 && <p className="text-stone-400 text-xs">None assigned yet.</p>}
          </div>
          <form onSubmit={addStaff} className="grid gap-2">
            <select
              value={staffForm.user_id}
              onChange={(e) => setStaffForm({ ...staffForm, user_id: e.target.value })}
              className="rounded-lg border border-stone-300 px-2 py-1.5 text-xs"
            >
              <option value="">Select staff</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.user_id}>{s.name} ({s.pay_structure})</option>
              ))}
            </select>
            <input
              placeholder="Role"
              value={staffForm.role}
              onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
              className="rounded-lg border border-stone-300 px-2 py-1.5 text-xs"
            />
            <input
              type="number"
              placeholder="Agreed rate (KES)"
              value={staffForm.agreed_rate}
              onChange={(e) => setStaffForm({ ...staffForm, agreed_rate: e.target.value })}
              className="rounded-lg border border-stone-300 px-2 py-1.5 text-xs"
            />
            <button className="rounded-full bg-stone-800 text-white px-3 py-1.5 text-xs hover:bg-stone-900">Assign</button>
          </form>
        </div>

        <div className="bg-white rounded-lg border border-stone-200 p-5">
          <h2 className="font-semibold text-stone-800 mb-3">Vendors</h2>
          <div className="grid gap-2 mb-4">
            {event.vendor_assignments.map((v) => (
              <div key={v.id} className="text-sm flex justify-between border-b border-stone-100 pb-1.5">
                <span>{v.vendor_name || `#${v.vendor_id}`}</span>
                <span className="text-stone-500">KES {Number(v.agreed_cost).toLocaleString()}</span>
              </div>
            ))}
            {event.vendor_assignments.length === 0 && <p className="text-stone-400 text-xs">None assigned yet.</p>}
          </div>
          <form onSubmit={addVendor} className="grid gap-2">
            <select
              value={vendorForm.vendor_id}
              onChange={(e) => setVendorForm({ ...vendorForm, vendor_id: e.target.value })}
              className="rounded-lg border border-stone-300 px-2 py-1.5 text-xs"
            >
              <option value="">Select vendor</option>
              {vendorList.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
            <input
              placeholder="Service description"
              value={vendorForm.service_description}
              onChange={(e) => setVendorForm({ ...vendorForm, service_description: e.target.value })}
              className="rounded-lg border border-stone-300 px-2 py-1.5 text-xs"
            />
            <input
              type="number"
              placeholder="Agreed cost (KES)"
              value={vendorForm.agreed_cost}
              onChange={(e) => setVendorForm({ ...vendorForm, agreed_cost: e.target.value })}
              className="rounded-lg border border-stone-300 px-2 py-1.5 text-xs"
            />
            <button className="rounded-full bg-stone-800 text-white px-3 py-1.5 text-xs hover:bg-stone-900">Assign</button>
          </form>
        </div>

        <div className="bg-white rounded-lg border border-stone-200 p-5">
          <h2 className="font-semibold text-stone-800 mb-3">Expenses</h2>
          <div className="grid gap-2 mb-4">
            {event.expenses.map((exp) => (
              <div key={exp.id} className="text-sm flex justify-between border-b border-stone-100 pb-1.5">
                <span>{exp.description || exp.category}</span>
                <span className="text-stone-500">KES {Number(exp.amount).toLocaleString()}</span>
              </div>
            ))}
            {event.expenses.length === 0 && <p className="text-stone-400 text-xs">None logged yet.</p>}
          </div>
          <form onSubmit={addExpense} className="grid gap-2">
            <input
              placeholder="Category"
              value={expenseForm.category}
              onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
              className="rounded-lg border border-stone-300 px-2 py-1.5 text-xs"
            />
            <input
              placeholder="Description"
              value={expenseForm.description}
              onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
              className="rounded-lg border border-stone-300 px-2 py-1.5 text-xs"
            />
            <input
              type="number"
              placeholder="Amount (KES)"
              value={expenseForm.amount}
              onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
              className="rounded-lg border border-stone-300 px-2 py-1.5 text-xs"
            />
            <button className="rounded-full bg-stone-800 text-white px-3 py-1.5 text-xs hover:bg-stone-900">Log expense</button>
          </form>
        </div>
      </div>
    </div>
  )
}
